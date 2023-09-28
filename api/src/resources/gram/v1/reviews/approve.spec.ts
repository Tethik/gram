import request from "supertest";
import * as jwt from "@gram/core/dist/auth/jwt.js";
import { DataAccessLayer } from "@gram/core/dist/data/dal.js";
import { Review, ReviewStatus } from "@gram/core/dist/data/reviews/Review.js";
import { systemProvider } from "@gram/core/dist/data/systems/systems.js";
import { _deleteAllTheThings } from "@gram/core/dist/data/utils.js";
import { createTestApp } from "../../../../test-util/app.js";
import { createSampleModel } from "../../../../test-util/model.js";
import {
  sampleOtherUser,
  sampleReviewer,
  sampleUser,
} from "../../../../test-util/sampleUser.js";

describe("Reviews.approve", () => {
  const validate = jest.spyOn(jwt, "validateToken");
  const systemGetById = jest.spyOn(systemProvider, "getSystem");

  let app: any;
  let pool: any;
  let dal: DataAccessLayer;
  let modelId: string;
  let review: Review;

  beforeAll(async () => {
    ({ app, pool, dal } = await createTestApp());

    validate.mockImplementation(async () => {
      return sampleUser;
    });
  });

  beforeEach(async () => {
    validate.mockImplementation(async () => sampleReviewer);

    /** Set up test model needed for review **/
    modelId = await createSampleModel(dal);

    review = new Review(
      modelId,
      "some-user",
      ReviewStatus.Requested,
      "some-reviewer"
    );
    await dal.reviewService.create(review);
  });

  it("should return 401 on un-authenticated request", async () => {
    const res = await request(app).post(`/api/v1/reviews/${modelId}/approve`);
    expect(res.status).toBe(401);
  });

  it("should return 403 on non-reviewer approval request (default user)", async () => {
    validate.mockImplementation(async () => sampleOtherUser);

    const res = await request(app)
      .post(`/api/v1/reviews/${modelId}/approve`)
      .set("Authorization", "bearer validToken");

    expect(res.status).toBe(403);
  });

  it("should return 200 on succesful approve [without note] for role.reviewer", async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/${modelId}/approve`)
      .set("Authorization", "bearer validToken");

    expect(res.status).toBe(200);
    expect(res.body.result).toBeTruthy();
  });

  it("should return 200 on succesful approve [with note] for role.reviewer", async () => {
    const res = await request(app)
      .post(`/api/v1/reviews/${modelId}/approve`)
      .set("Authorization", "bearer validToken")
      .send({ note: "Approved with note" });

    expect(res.status).toBe(200);
    expect(res.body.result).toBeTruthy();

    const rev = await dal.reviewService.getByModelId(modelId);
    expect(rev!.status).toEqual("approved");
    expect(rev!.note).toEqual("Approved with note");
  });

  afterAll(async () => {
    validate.mockRestore();
    systemGetById.mockRestore();
    await _deleteAllTheThings(pool);
  });
});
