import { jest } from "@jest/globals";
import request from "supertest";
import * as jwt from "@gram/core/dist/auth/jwt.js";
import Control from "@gram/core/dist/data/controls/Control.js";
import { DataAccessLayer } from "@gram/core/dist/data/dal.js";
import Model from "@gram/core/dist/data/models/Model.js";
import Threat from "@gram/core/dist/data/threats/Threat.js";
import { _deleteAllTheThings } from "@gram/core/dist/data/utils.js";
import { createTestApp } from "../../../../test-util/app.js";
import { sampleOwnedSystem } from "../../../../test-util/sampleOwnedSystem.js";
import { sampleUser } from "../../../../test-util/sampleUser.js";

describe("Controls.list", () => {
  const validate = jest.spyOn(jwt, "validateToken");

  let app: any;
  let pool: any;
  let dal: DataAccessLayer;
  const email = "test@abc.xyz";
  const componentId = "fe93572e-9d0c-4afe-b042-e02c1c45f704";
  let modelId: string;
  let threatId: string;

  beforeAll(async () => {
    ({ pool, app, dal } = await createTestApp());
  });

  beforeEach(async () => {
    validate.mockImplementation(async () => sampleUser);

    const model = new Model(sampleOwnedSystem.id, "version", email);
    model.data = { components: [], dataFlows: [] };
    modelId = await dal.modelService.create(model);

    const threat = new Threat(
      "Threat",
      "threat description",
      modelId,
      componentId,
      email
    );
    threatId = await dal.threatService.create(threat);

    const control = new Control(
      "Control",
      "control description",
      false,
      modelId,
      componentId,
      email
    );
    await dal.controlService.create(control);
  });

  it("should return 401 on un-authenticated request", async () => {
    const res = await request(app).get(`/api/v1/models/${modelId}/controls`);
    expect(res.status).toBe(401);
  });

  it("should return 200 and a list of controls", async () => {
    const res = await request(app)
      .get(`/api/v1/models/${modelId}/controls`)
      .set("Authorization", "bearer validToken");

    expect(res.status).toBe(200);
  });

  afterAll(async () => {
    validate.mockRestore();
    await _deleteAllTheThings(pool);
  });
});
