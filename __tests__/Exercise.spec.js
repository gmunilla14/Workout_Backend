const request = require("supertest");
const app = require("../app");
const Exercise = require("../models/Exercise");
const User = require("../models/User");
const Muscle = require("../models/Muscle");

const sequelize = require("../config/database");

const muscles = ["Bicep", "Tricep", "Quad", "Hamstring", "Rear Delt"];

const adminString = process.env.ADMIN_STRING;

const defaultExercise = {
  name: "Curls",
  muscles: ["Bicep"],
  notes: "notes",
};

const name_null = "Name is required";
const name_size = "Name must be at most 32 characters";
const no_muscles = "Exercise must have at least one muscle";
const wrong_muscles = "Must choose valid muscles";
const notes_size = "Notes may be at most 200 characters";

const createActiveUser = async () => {
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

  return userToken;
};

const createExercise = (name, muscles, notes, userToken) => {
  return request(app)
    .post("/api/1.0/exercises")
    .set("x-auth-token", userToken)
    .send({
      name,
      muscles,
      notes,
    });
};

beforeAll(() => {
  sequelize.sync();

  muscles.forEach(async (muscle) => {
    await request(app)
      .post("/api/1.0/muscles")
      .send({
        string: process.env.ADMIN_STRING,
        muscle: {
          name: muscle,
        },
      });
  });
  return;
});

beforeEach(() => {
  User.destroy({ truncate: true });
  return Exercise.destroy({ truncate: true });
});

describe("Create exercise", () => {
  it("returns 401 status when trying to create without being authenticated", async () => {
    const response = createExercise("Curls", ["Bicep"], "", " fdsafd");
    expect(response.status).toBe(401);
  });

  it("returns Not authorized when trying to create without being authenticated", async () => {
    const response = await createExercise("Curls", ["Bicep"], "", " fdsafd");
    expect(response.body.message).toBe("Not authorized");
  });

  it("returns 403 for inactive user", async () => {
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;
    const response = await createExercise(
      "Curls",
      ["Bicep"],
      "Notes",
      userToken
    );

    expect(response.status).toBe(403);
  });

  it("returns User inactive for inactive user", async () => {
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;

    const response = await createExercise(
      "Curls",
      ["Bicep"],
      "Notes",
      userToken
    );

    expect(response.body.message).toBe("User inactive");
  });

  it("returns status 200 when created by active authenticated user", async () => {
    const userToken = createActiveUser();
    const response = await createExercise(
      "Curls",
      ["Bicep"],
      "Notes",
      userToken
    );

    expect(response.status).toBe(200);
  });

  it("returns Created exercise when created by active authenticated user", async () => {
    const userToken = createActiveUser();
    const response = await createExercise(
      "Curls",
      ["Bicep"],
      "Notes",
      userToken
    );

    expect(response.body.message).toBe("Created exercise");
  });

  it("creates exercise in database", async () => {
    const userToken = createActiveUser();
    await createExercise("Curls", ["Bicep"], "Notes", userToken);

    const exerciseList = Exercise.findAll();

    expect(exerciseList.length).toBe(1);
  });

  it("creates exercise in database ", async () => {
    const userToken = createActiveUser();
    await createExercise("Curls", ["Bicep"], "Notes", userToken);

    const exerciseList = Exercise.findAll();
    const exercise = exerciseList[0];

    const userList = User.findAll();
    const user = userList[0];

    expect(exercise.name).toBe("Curls");
    expect(exercise.muscles.length).toBe(1);
    expect(exercise.notes).toBe("Notes");
    expect(exercise.uid).toBe(user.id);
  });

  it("creates exercise with muscle that is ID of correct muscle", async () => {
    const userToken = createActiveUser();
    await createExercise("Curls", ["Bicep"], "Notes", userToken);

    const exerciseList = Exercise.findAll();
    const exercise = exerciseList[0];

    const muscle = Muscle.findOne({ where: { name: "Bicep" } });

    expect(exercise.muscles[0]).toBe(muscle.id);
  });

  it.each([
    ["name", null, name_null],
    ["name", "", name_size],
    ["name", "a".repeat(33), name_size],
    ["muscles", null, no_muscles],
    ["muscles", [], no_muscles],
    ["muscles", ["clams"], wrong_muscles],
    ["muscles", ["Bicep", "clams"], wrong_muscles],
    ["notes", "a".repeat(201), notes_size],
  ])("when %s is %s, return %s", async (field, value, expectedMessage) => {
    let exercise = { ...defaultExercise };

    exercise[field] = value;
    const userToken = createActiveUser();
    const response = await createExercise(
      exercise.name,
      exercise.muscles,
      exercise.notes,
      userToken
    );

    expect(response.body.validationErrors[field]).toBe(expectedMessage);
  });

  it("returns two validation errors when name is null and muscles are wrong", async () => {
    const userToken = createActiveUser();
    const response = await createExercise(null, ["crabs"], "notes", userToken);

    expect(response.body.validationErrors["name"]).toBe(name_null);
    expect(response.body.validationErrors["muscles"]).toBe(wrong_muscles);
  });

  it("creates exercise with uid of admin when admin string is provided", async () => {
    const userToken = createActiveUser();

    await request(app)
      .post("/api/1.0/exercises")
      .set("x-auth-token", userToken)
      .send({
        name: defaultExercise.name,
        muscles: defaultExercise.muscles,
        notes: defaultExercise.notes,
        adminString,
      });

    const exerciseList = Exercise.findAll();
    const exercise = exerciseList[0];

    expect(exercise.uid).toBe("admin");
  });
});