"use strict";

process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");

const db = require("../db");


let testCompany;
let testInvoice;

beforeEach(async function () {
  await db.query("DELETE FROM invoices");
  await db.query("DELETE FROM companies");

  const cResults = await db.query(`
    INSERT INTO companies (code, name, description)
    VALUES ('tst', 'Test Co', 'Test description')
    RETURNING code, name, description`);

  const iResults = await db.query(`
    INSERT INTO invoices (comp_code, amt, paid, paid_date)
    VALUES ('tst', 1000, FALSE, NULL)
    RETURNING id, comp_code, amt, paid, add_date, paid_date`);

  testCompany = cResults.rows[0];
  testInvoice = iResults.rows[0];
});

describe("GET /companies", function () {
  test("Gets a list of companies", async function () {
    const response = await request(app).get(`/companies`);
    expect(response.body).toEqual({ companies: [{ code: testCompany.code, name: testCompany.name }] });
  });
});

describe("GET /companies/:code", function () {
  test("Gets a company", async function () {
    const response = await request(app).get(`/companies/${testCompany.code}`);
    expect(response.body).toEqual({ company: {
      code: testCompany.code,
      name: testCompany.name,
      description: testCompany.description,
      invoices: [testInvoice.id]
    } });
  });

  test("Responds with 404 if can't find company", async function () {
    const response = await request(app).get("/companies/0");
    expect(response.statusCode).toEqual(404);
  });
});


describe("POST /companies", function () {
  test("Creates a company", async function () {
    const addedCompany = {
      code: "tsl",
      name: "Tesla",
      description: "Electric cars"
    };
    const response = await request(app)
    .post("/companies")
    .send(addedCompany);
    expect(response.body).toEqual({
      company: {code: "tsl", name: "Tesla", description: "Electric cars"}
    });
    expect(response.statusCode).toEqual(201);
  })

  test("Responds with 400 if empty body", async function () {
    const response = await request(app)
      .post(`/companies`)
      .send();
    expect(response.statusCode).toEqual(400);
  });

})






afterAll(async function () {
  await db.end();
});