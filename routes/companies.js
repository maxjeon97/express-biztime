"use strict";

const express = require("express");
const db = require("../db");

const { BadRequestError, NotFoundError } = require("../expressError");

const router = new express.Router();


/**GET request -
 * Returns JSON list of companies: {companies: [{code, name}, ...]}
 */

router.get("", async function (req, res, next) {
  const result = await db.query(
    `SELECT code, name
        FROM companies`
  );

  return res.json({ companies: result.rows });
});


/**GET request -
 * Given company code,
 * Returns JSON of a single company: { company: {code, name, description} }
 */

router.get("/:code", async function (req, res, next) {
  const code = req.params.code;

  const result = await db.query(
    `SELECT code, name, description
        FROM companies
        WHERE code = $1`, [code]
  );

  const company = result.rows[0];

  if (!company) {
    throw new NotFoundError("This company does not exist");
  }

  return res.json({ company: company });
});


/** POST request -
 * Given JSON body data {code, name, description}
 * Create new company, returning JSON {company: {code, name, description}}
*/

router.post("", async function (req, res, next) {
  if (!req.body ||
      !("code" in req.body) ||
      !("name" in req.body) ||
      !("description" in req.body)) {
    throw new BadRequestError("Must have code, name, description in request");
  }

  const { code, name, description } = req.body;
  const result = await db.query(
    `INSERT INTO companies (code, name, description)
           VALUES ($1, $2, $3)
           RETURNING code, name, description`,
    [code, name, description]
  );

  const company = result.rows[0];
  return res.status(201).json({ company: company });
});

module.exports = router;