const request = require("supertest");
const app = require("../app");
const Muscle = require("../models/Muscle");
const sequelize = require("../config/database");
const User = require("../models/User");

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  Muscle.destroy({ truncate: true });
  return User.destroy({ truncate: true });
});

const correctString = process.env.ADMIN_STRING;

const postMuscle = (string, name) => {
  return request(app).post("/api/1.0/muscles").send({
    string,
    muscle: {
      name,
    },
  });
};

const getMuscles = (token) => {
  return request(app).get("/api/1.0/muscles").set("x-auth-token", token);
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

  it("returns 401 for user trying to get muscles without authentication", async () => {
    await postMuscle(correctString, "Bicep");
    const response = await getMuscles(" ");
    expect(response.status).toBe(401);
  });

  it("returns Not authenticated for user trying to get muscles without authentication", async () => {
    await postMuscle(correctString, "Bicep");
    const response = await getMuscles(" ");
    expect(response.body.message).toBe("Not authenticated");
  });

  it("returns 403 for inactive user", async () => {
    await postMuscle(correctString, "Bicep");
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;
    const response = await getMuscles(userToken);
    expect(response.status).toBe(403);
  });

  it("returns User inactive for inactive user", async () => {
    await postMuscle(correctString, "Bicep");
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;
    const response = await getMuscles(userToken);
    expect(response.body.message).toBe("User inactive");
  });

  it("returns a list of muscles to authorized active user", async () => {
    //Create Muscle
    await postMuscle(correctString, "Bicep");

    //Create User
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;
    const userList = await User.findAll();
    const savedUser = userList[0];

    //Activate User
    await request(app)
      .post("/api/1.0/activate")
      .set("x-auth-token", userToken)
      .send({ token: savedUser.activationToken });

    //Get Muscles
    const muscleResponse = await getMuscles(userToken);
    const muscle = muscleResponse.body[0];
    expect(muscleResponse.body.length).toBe(1);
    expect(muscle.name).toBe("Bicep");
  });
});
