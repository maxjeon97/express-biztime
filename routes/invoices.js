"use strict";

const express = require("express");
const db = require("../db");

const { BadRequestError, NotFoundError } = require("../expressError");

const router = new express.Router();


/**GET request -
 * Returns JSON list of invoices: {invoices: [{id, comp_code}, ...]}
 */

router.get("", async function (req, res, next) {
  const result = await db.query(
    `SELECT id, comp_code
        FROM invoices`
  );

  return res.json({ invoices: result.rows });
});


/**GET request -
 * Given invoice id,
 * Returns JSON of a single invoice:
 * { invoice:
 *    { id, amt, paid, add_date, paid_date, company: { code, name, description }
 *    }
 * }
 */

router.get("/:id", async function (req, res, next) {
  const id = Number(req.params.id);

  const iResults = await db.query(
    `SELECT id, amt, paid, add_date, paid_date
        FROM invoices
        WHERE id = $1`, [id]
  );

  const invoice = iResults.rows[0];

  if (!invoice) {
    throw new NotFoundError("This invoice does not exist");
  }

  const cResults = await db.query(
    `SELECT code, name, description
        FROM companies
        JOIN invoices ON companies.code = invoices.comp_code
        WHERE invoices.id = $1`, [id]
  );

  invoice.company = cResults.rows[0];

  return res.json({ invoice: invoice });
});


/** POST request -
 * Given JSON body data {comp_code, amt}
 * Create new invoice, returning JSON
 * {invoice: { id, comp_code, amt, paid, add_date, paid_date }}
*/

router.post("", async function (req, res, next) {
  if (!req.body ||
    !("comp_code" in req.body) ||
    !("amt" in req.body)) {
    throw new BadRequestError("Must have comp_code, amt in request");
  }

  const { comp_code, amt } = req.body;
  const result = await db.query(
    `INSERT INTO invoices (comp_code, amt)
           VALUES ($1, $2)
           RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    [comp_code, amt]
  );

  const invoice = result.rows[0];
  return res.status(201).json({ invoice: invoice });
});

module.exports = router;