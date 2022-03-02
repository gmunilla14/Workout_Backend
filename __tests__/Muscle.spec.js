const request = require("supertest");
const app = require("../app");
const Muscle = require("../models/Muscle");
const sequelize = require("../config/database");

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return Muscle.destroy({ truncate: true });
});

const correctString = "jf320jfjje0cjcnoi20923n4oijojfj29";

const postMuscle = (string, name) => {
  return request(app).post("/api/1.0/muscles").send({
    string,
    muscle: {
      name,
    },
  });
};

describe("Create and View Muscles", () => {
  it("returns 401 status when attempting to create without correct string", async () => {
    const response = await postMuscle("notstring", "Bicep");
    expect(response.status).toBe(401);
  });

  it("returns 200 status when attempting to create with correct string", async () => {
    const response = await postMuscle(correctString, "Bicep");
    expect(response.status).toBe(200);
  });

  it("returns Muscle created when creating muscle correctly", async () => {
    const response = await postMuscle(correctString, "Bicep");
    expect(response.body.message).toBe("Muscle created");
  });

  it("creates muscle in database", async () => {
    await postMuscle(correctString, "Bicep");
    const muscleList = await Muscle.findAll();
    const muscle = muscleList[0];
    expect(muscle.name).toBe("Bicep");
  });

  it("returns 400 status if a muscle name is not included", async () => {
    const response = await postMuscle("notstring", null);
    expect(response.status).toBe(400);
  });

  it("returns 400 status if there is no muscle included", async () => {
    const response = await request(app).post("/api/1.0/muscles").send({
      string: correctString,
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 status if there is no string included", async () => {
    const response = await request(app)
      .post("/api/1.0/muscles")
      .send({
        muscle: {
          name: "Bicep",
        },
      });

    expect(response.status).toBe(400);
  });
});
