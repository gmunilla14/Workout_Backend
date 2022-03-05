const request = require("supertest");
const app = require("../app");
const { Exercise } = require("../models/Exercise");
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const muscles = ["Bicep", "Tricep", "Quad", "Hamstring", "Rear Delt"];

const adminString = process.env.ADMIN_STRING;

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  mongoose.connect(mongoServer.getUri(), {
    useUnifiedTopology: true,
  });

  muscles.forEach(async (muscle) => {
    return request(app)
      .post("/api/1.0/muscles")
      .send({
        string: adminString,
        muscle: {
          name: muscle,
        },
      });
  });
});

beforeEach(async () => {
  await User.deleteMany({});
  return await Exercise.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

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

const createUser = async () => {
  const userResponse = await request(app).post("/api/1.0/signup").send({
    username: "user1",
    email: "user1@mail.com",
    password: "Password1",
  });
  const userToken = userResponse.body.token;
  return userToken;
};

const activateUser = async (jwtToken, activationToken) => {
  await request(app)
    .post("/api/1.0/activate")
    .set("x-auth-token", jwtToken)
    .send({ token: activationToken });
};

const createExercise = async (name, muscles, notes, userToken) => {
  return await request(app)
    .post("/api/1.0/exercises")
    .set("x-auth-token", userToken)
    .send({
      name,
      muscles,
      notes,
    });
};

describe("Create exercise", () => {
  it("returns 401 status when trying to create without being authenticated", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    const response = await createExercise("Curls", [bicep._id], "", " fdsafd");
    expect(response.status).toBe(401);
  });

  it("returns Not authenticated when trying to create without being authenticated", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    const response = await createExercise("Curls", [bicep._id], "", " fdsafd");
    expect(response.body.message).toBe("Not authenticated");
  });

  it("returns 403 for inactive user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;
    const response = await createExercise(
      "Curls",
      [bicep._id],
      "Notes",
      userToken
    );

    expect(response.status).toBe(403);
  });

  it("returns User inactive for inactive user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    const userResponse = await request(app).post("/api/1.0/signup").send({
      username: "user1",
      email: "user1@mail.com",
      password: "Password1",
    });
    const userToken = userResponse.body.token;

    const response = await createExercise(
      "Curls",
      [bicep._id],
      "Notes",
      userToken
    );

    expect(response.body.message).toBe("User inactive");
  });

  it("returns status 200 when created by active authenticated user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];
    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    const response = await createExercise(
      "Curls",
      [bicep._id],
      "Notes",
      userToken
    );

    expect(response.status).toBe(200);
  });

  it("returns Created exercise when created by active authenticated user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    const response = await createExercise(
      "Curls",
      [bicep._id],
      "Notes",
      userToken
    );

    expect(response.body.message).toBe("Created exercise");
  });

  it("creates exercise in database", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    await createExercise("Curls", [bicep._id], "Notes", userToken);

    const exerciseList = await Exercise.find();
    console.log(exerciseList);
    expect(exerciseList.length).toBe(1);
  });

  it("creates exercise in database with correct fields", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    await createExercise("Curls", [bicep._id], "Notes", userToken);

    const exerciseList = await Exercise.find();
    const exercise = exerciseList[0];

    expect(exercise.name).toBe("Curls");
    expect(exercise.muscles.length).toBe(1);
    expect(exercise.notes).toBe("Notes");
    expect(exercise.uid).toBe(String(savedUser._id));
  });

  it("creates exercise with correct muscle", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    await createExercise("Curls", [bicep._id], "Notes", userToken);

    const exerciseList = await Exercise.find();
    const exercise = exerciseList[0];
    const muscleID = exercise.muscles[0];

    const muscle = await Muscle.findOne({ name: "Bicep" });
    expect(muscleID).toBe(String(muscle._id));
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
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const muscleIDs = exercise.muscles.map((muscle) => {
      if (muscle === "Bicep") {
        return bicep._id;
      } else {
        return muscle;
      }
    });
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    const response = await createExercise(
      exercise.name,
      muscleIDs,
      exercise.notes,
      userToken
    );

    expect(response.body.validationErrors[field]).toBe(expectedMessage);
  });

  it("returns two validation errors when name is null and muscles are wrong", async () => {
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);
    const response = await createExercise(null, ["crabs"], "notes", userToken);

    expect(response.body.validationErrors["name"]).toBe(name_null);
    expect(response.body.validationErrors["muscles"]).toBe(wrong_muscles);
  });

  it("creates exercise with uid of admin when admin string is provided", async () => {
    //Create User
    const userToken = await createUser();
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate User
    await activateUser(userToken, savedUser.activationToken);

    await request(app)
      .post("/api/1.0/exercises")
      .set("x-auth-token", userToken)
      .send({
        name: defaultExercise.name,
        muscles: defaultExercise.muscles,
        notes: defaultExercise.notes,
        adminString,
      });

    const exerciseList = await Exercise.find();
    const exercise = exerciseList[0];

    expect(exercise.uid).toBe("admin");
  });
});
