import request from "supertest";
import * as jwt from "@gram/core/dist/auth/jwt.js";
import { systemProvider } from "@gram/core/dist/data/systems/systems.js";
import { createTestApp } from "../../../../test-util/app.js";
import { sampleOwnedSystem } from "../../../../test-util/sampleOwnedSystem.js";
import { sampleUser } from "../../../../test-util/sampleUser.js";
import { jest } from "@jest/globals";
import { sampleUserToken } from "../../../../test-util/sampleTokens.js";

const token = await sampleUserToken();

describe("systems.list", () => {
  let app: any;
  let list: any;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  beforeEach(() => {
    list = jest.spyOn(systemProvider, "listSystems");
    list.mockImplementation(async () => {
      return { systems: [sampleOwnedSystem], total: 1 };
    });
  });

  it("should return 401 on un-authenticated request", async () => {
    const res = await request(app).get("/api/v1/systems");
    expect(res.status).toBe(401);
  });

  it("should return 400 with no filter query parameter", async () => {
    const res = await request(app)
      .get("/api/v1/systems")
      .set("Authorization", token);
    expect(res.status).toBe(400);
  });

  it("should return 400 with invalid filter query parameter", async () => {
    const res = await request(app)
      .get("/api/v1/systems?filter=123")
      .set("Authorization", token);
    expect(res.status).toBe(400);
  });

  it("should return 500 when list() returns unknown error", async () => {
    list.mockImplementation(async () => {
      const error = new Error("Something messed up");
      error.name = "Some other error";
      throw error;
    });

    const res = await request(app)
      .get("/api/v1/systems?filter=batch")
      .set("Authorization", token);
    expect(res.status).toBe(500);
  });

  it("should return 200 with dummy results", async () => {
    const res = await request(app)
      .get("/api/v1/systems?filter=batch")
      .set("Authorization", token);
    expect(res.status).toBe(200);
    expect(res.body.systems[0]).toEqual(sampleOwnedSystem);
  });

  it("should return 200 with dummy results (team filter)", async () => {
    const res = await request(app)
      .get("/api/v1/systems?filter=team")
      .set("Authorization", token);
    expect(res.status).toBe(200);
    expect(res.body.systems[0]).toEqual(sampleOwnedSystem);
  });

  afterAll(() => {
    list.mockRestore();
  });
});
