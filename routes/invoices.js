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
        FROM invoices
        ORDER BY id`
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
    `SELECT id, amt, paid, add_date, paid_date, code, name, description
        FROM invoices
        JOIN companies ON companies.code = invoices.comp_code
        WHERE id = $1`, [id]
  );

  const data = iResults.rows[0];

  if (!data) {
    throw new NotFoundError("This invoice does not exist");
  }

  const invoice = {
    invoice: {
      id: data.id,
      amt: data.amt,
      paid: data.paid,
      add_date: data.add_date,
      paid_date: data.paid_date,
      company: {
        code: data.code,
        name: data.name,
        description: data.description
      }
    }
  };

  return res.json(invoice);
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

/** PUT request -
 * Given JSON body data {amt, paid}
 * Update the invoice, returning JSON
 * {invoice: {id, comp_code, amt, paid, add_date, paid_date}}
*/

router.put("/:id", async function (req, res, next) {
  if (req.body === undefined ||
    "id" in req.body ||
    !("amt" in req.body) ||
    !("paid" in req.body)) {
    throw new BadRequestError("Not allowed");
  }

  const id = req.params.id;
  const { amt, paid } = req.body;

  const currentInvoice = await db.query(
    `SELECT paid, paid_date
        FROM invoices
        WHERE id = $1`, [id]
  );

  if (!currentInvoice) throw new NotFoundError("This invoice does not exist");

  const paidDate = generatePaidDate(currentInvoice, paid);

  const results = await db.query(
    `UPDATE invoices
        SET amt=$1, paid=$2, paid_date=$3
        WHERE id = $4
        RETURNING id, comp_code, amt, paid, add_date, paid_date`,
    [amt, paid, paidDate, id]);

  const invoice = results.rows[0];

  return res.json({ invoice: invoice });
});


/**Generates paidDate based on current invoice paid date and updated paid
 * status
*/
function generatePaidDate(invoice, paid) {
  if(!(invoice.paid_date) && paid) {
    return new Date();
  }
  else if(invoice.paid && !paid) {
    return null;
  }
  else {
    return invoice.paid_date;
  }
}


/** Delete request -
 * Delete the invoice, returning JSON { status: "deleted" }
*/

router.delete("/:id", async function (req, res, next) {
  const id = req.params.id;
  const results = await db.query(
    "DELETE FROM invoices WHERE id = $1 RETURNING id", [id]);
  const invoice = results.rows[0];

  if (!invoice) throw new NotFoundError("This invoice does not exist");
  return res.json({ status: "deleted" });
});


module.exports = router;