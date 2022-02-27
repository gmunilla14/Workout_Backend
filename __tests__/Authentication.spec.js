const request = require("supertest");
const app = require("../app");

describe("Sign Up User", () => {
  it("returns 200 status when sending valid signup request", async () => {
    const response = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    expect(response.status).toBe(200);
  });
});
