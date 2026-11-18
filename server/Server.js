const express = require("express");
const cors = require("cors");
const oracledb = require("oracledb");

// ---------- CONFIG: change these to match your Oracle install ----------
const DB = {
  user: "mobile_proj",
  password: "12345",
  connectString: "localhost:1521/XEPDB1",
};
const PORT = 3000;

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

// ---------- HELPERS ----------
// Run SQL and return rows with lower-case keys ({ ID: 1 } -> { id: 1 })
async function run(sql, binds = {}) {
  const conn = await oracledb.getConnection();
  try {
    const result = await conn.execute(sql, binds);
    if (result.rows) {
      result.rows = result.rows.map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]))
      );
    }
    return result;
  } finally {
    await conn.close();
  }
}
// Run several statements as one transaction (all succeed or all roll back)
async function tx(statements) {
  const conn = await oracledb.getConnection();
  try {
    let last;
    for (const [sql, binds] of statements) {
      last = await conn.execute(sql, binds, { autoCommit: false });
    }
    await conn.commit();
    return last; // result of the final statement
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    await conn.close();
  }
}
const rows = async (sql, binds) => (await run(sql, binds)).rows;
const one = async (sql, binds) => (await rows(sql, binds))[0];
const v = (x) => (x === undefined || x === "" ? null : x); // empty -> NULL
const OUT_ID = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };

// Wrap async routes so DB errors return a clean 400 instead of crashing
const safe = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (e) {
    console.error(e.message);
    res.status(400).json({ error: e.message });
  }
};

const getUser = (id) =>
  one(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, w.id AS workshop_id
     FROM users u LEFT JOIN workshops w ON w.user_id = u.id
     WHERE u.id = :id`,
    { id }
  );

const APPT = `
  SELECT a.id, a.car_id, a.workshop_id, a.service_id, a.scheduled_at, a.status,
         a.notes, a.issue_photo_url,
         s.name AS service_name, s.price, w.name AS workshop_name,
         c.make, c.model, c.plate_number
  FROM appointments a
  JOIN services  s ON s.id = a.service_id
  JOIN workshops w ON w.id = a.workshop_id
  JOIN cars      c ON c.id = a.car_id`;

const app = express();
app.use(cors());
app.use(express.json());

// ---------- AUTH / USERS ----------
app.post("/auth/register", safe(async (req, res) => {
  const { fullName, email, password, phone, role, address, latitude, longitude } = req.body;
  const r = await run(
    `INSERT INTO users (full_name, email, password, phone, role)
     VALUES (:fullName, :email, :password, :phone, :role)
     RETURNING id INTO :id`,
    { fullName: v(fullName), email: v(email), password: v(password), phone: v(phone), role: v(role), id: OUT_ID }
  );
  const userId = r.outBinds.id[0];
  if (role === "workshop") {
    await run(
      `INSERT INTO workshops (user_id, name, address, latitude, longitude)
       VALUES (:userId, :name, :address, :lat, :lng)`,
      { userId, name: v(fullName), address: v(address), lat: v(latitude), lng: v(longitude) }
    );
  }
  res.status(201).json(await getUser(userId));
}));

app.post("/auth/login", safe(async (req, res) => {
  const u = await one(
    `SELECT id FROM users WHERE email = :email AND password = :password`,
    { email: v(req.body.email), password: v(req.body.password) }
  );
  if (!u) return res.status(401).json({ error: "Wrong email or password" });
  res.json(await getUser(u.id));
}));

app.put("/users/:id", safe(async (req, res) => {
  await run(
    `UPDATE users SET full_name = :fullName, phone = :phone WHERE id = :id`,
    { fullName: v(req.body.fullName), phone: v(req.body.phone), id: Number(req.params.id) }
  );
  res.json(await getUser(Number(req.params.id)));
}));

// ---------- WORKSHOPS ----------
app.get("/workshops", safe(async (req, res) => {
  res.json(await rows(`SELECT * FROM workshops ORDER BY name`));
}));

app.get("/workshops/:id", safe(async (req, res) => {
  const id = Number(req.params.id);
  const w = await one(`SELECT * FROM workshops WHERE id = :id`, { id });
  if (!w) return res.status(404).json({ error: "Workshop not found" });
  w.services = await rows(`SELECT * FROM services WHERE workshop_id = :id ORDER BY name`, { id });
  res.json(w);
}));

// ---------- CARS ----------
app.get("/cars", safe(async (req, res) => {
  res.json(await rows(`SELECT * FROM cars WHERE owner_id = :ownerId ORDER BY id`, { ownerId: Number(req.query.ownerId) }));
}));

app.post("/cars", safe(async (req, res) => {
  const { ownerId, make, model, year, plateNumber, mileage, photoUrl } = req.body;
  const r = await run(
    `INSERT INTO cars (owner_id, make, model, year, plate_number, mileage, photo_url)
     VALUES (:ownerId, :make, :model, :year, :plate, :mileage, :photo)
     RETURNING id INTO :id`,
    { ownerId: v(ownerId), make: v(make), model: v(model), year: v(year), plate: v(plateNumber),
      mileage: v(mileage), photo: v(photoUrl), id: OUT_ID }
  );
  res.status(201).json(await one(`SELECT * FROM cars WHERE id = :id`, { id: r.outBinds.id[0] }));
}));

app.put("/cars/:id", safe(async (req, res) => {
  const { make, model, year, plateNumber, mileage, photoUrl } = req.body;
  const id = Number(req.params.id);
  await run(
    `UPDATE cars SET make = :make, model = :model, year = :year, plate_number = :plate,
            mileage = :mileage, photo_url = :photo
     WHERE id = :id`,
    { make: v(make), model: v(model), year: v(year), plate: v(plateNumber), mileage: v(mileage), photo: v(photoUrl), id }
  );
  res.json(await one(`SELECT * FROM cars WHERE id = :id`, { id }));
}));

// ---------- APPOINTMENTS ----------
// GET /appointments?ownerId=2     -> owner's bookings
// GET /appointments?workshopId=1  -> workshop's requests
app.get("/appointments", safe(async (req, res) => {
  if (req.query.workshopId) {
    return res.json(await rows(`${APPT} WHERE a.workshop_id = :id ORDER BY a.scheduled_at`, { id: Number(req.query.workshopId) }));
  }
  res.json(await rows(`${APPT} WHERE c.owner_id = :id ORDER BY a.scheduled_at DESC`, { id: Number(req.query.ownerId) }));
}));

app.post("/appointments", safe(async (req, res) => {
  const { carId, workshopId, serviceId, scheduledAt, notes, issuePhotoUrl } = req.body;
  const r = await run(
    `INSERT INTO appointments (car_id, workshop_id, service_id, scheduled_at, notes, issue_photo_url)
     VALUES (:carId, :workshopId, :serviceId, :scheduledAt, :notes, :photo)
     RETURNING id INTO :id`,
    { carId: v(carId), workshopId: v(workshopId), serviceId: v(serviceId),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: v(notes), photo: v(issuePhotoUrl), id: OUT_ID }
  );
  res.status(201).json(await one(`${APPT} WHERE a.id = :id`, { id: r.outBinds.id[0] }));
}));

// body: { "status": "confirmed" | "completed" | "cancelled" }
app.put("/appointments/:id/status", safe(async (req, res) => {
  const id = Number(req.params.id);
  await run(`UPDATE appointments SET status = :status WHERE id = :id`, { status: v(req.body.status), id });
  res.json(await one(`${APPT} WHERE a.id = :id`, { id }));
}));

// ---------- REVIEWS ----------
app.post("/reviews", safe(async (req, res) => {
  const { appointmentId, rating, comment } = req.body;
  const a = await one(`SELECT status FROM appointments WHERE id = :id`, { id: v(appointmentId) });
  if (!a || a.status !== "completed") {
    return res.status(400).json({ error: "Only completed appointments can be reviewed" });
  }
  await run(
    `INSERT INTO reviews (appointment_id, rating, comment_text) VALUES (:appointmentId, :rating, :comment)`,
    { appointmentId, rating: v(rating), comment: v(comment) }
  ); // trigger trg_reviews_rating updates workshops.avg_rating
  res.status(201).json({ ok: true });
}));

// ---------- DELETE ENDPOINTS ----------
// Child rows are removed first so foreign keys don't block the delete.
const notFound = (res) => res.status(404).json({ error: "Not found" });

// Delete an account (and, for a workshop, its workshop + services)
app.delete("/users/:id", safe(async (req, res) => {
  const id = Number(req.params.id);
  const r = await tx([
    [`DELETE FROM reviews WHERE appointment_id IN (
        SELECT a.id FROM appointments a
        LEFT JOIN cars c      ON c.id = a.car_id
        LEFT JOIN workshops w ON w.id = a.workshop_id
        WHERE c.owner_id = :id OR w.user_id = :id)`, { id }],
    [`DELETE FROM appointments WHERE car_id IN (SELECT id FROM cars WHERE owner_id = :id)
        OR workshop_id IN (SELECT id FROM workshops WHERE user_id = :id)`, { id }],
    [`DELETE FROM users WHERE id = :id`, { id }], // cars, workshops, services cascade
  ]);
  if (r.rowsAffected === 0) return notFound(res);
  res.status(204).end();
}));

// Delete a car (and its bookings + reviews)
app.delete("/cars/:id", safe(async (req, res) => {
  const id = Number(req.params.id);
  const r = await tx([
    [`DELETE FROM reviews WHERE appointment_id IN (SELECT id FROM appointments WHERE car_id = :id)`, { id }],
    [`DELETE FROM appointments WHERE car_id = :id`, { id }],
    [`DELETE FROM cars WHERE id = :id`, { id }],
  ]);
  if (r.rowsAffected === 0) return notFound(res);
  res.status(204).end();
}));

// Delete a booking (and its review)
app.delete("/appointments/:id", safe(async (req, res) => {
  const id = Number(req.params.id);
  const r = await tx([
    [`DELETE FROM reviews WHERE appointment_id = :id`, { id }],
    [`DELETE FROM appointments WHERE id = :id`, { id }],
  ]);
  if (r.rowsAffected === 0) return notFound(res);
  res.status(204).end();
}));

// Delete a review (trigger recalculates the workshop rating)
app.delete("/reviews/:id", safe(async (req, res) => {
  const r = await run(`DELETE FROM reviews WHERE id = :id`, { id: Number(req.params.id) });
  if (r.rowsAffected === 0) return notFound(res);
  res.status(204).end();
}));

// ---------- START ----------
oracledb
  .createPool(DB)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log(`PitStop API running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Could not connect to Oracle:", e.message);
    process.exit(1);
  });