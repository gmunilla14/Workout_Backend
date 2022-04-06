const request = require("supertest");
const app = require("../app");
const { Exercise } = require("../models/Exercise");
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");
const { Plan } = require("../models/Plan");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const { Workout } = require("../models/Workout");
const muscles = ["Bicep", "Tricep", "Quad", "Hamstring", "Rear Delt"];
const adminString = process.env.ADMIN_STRING;

let mongoServer;

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

const getExercises = async (userToken) => {
  return await request(app)
    .get("/api/1.0/exercises")
    .set("x-auth-token", userToken);
};

const createValidWorkout = async (legs = false) => {
  //Create User
  const userToken = await createUser();
  const userList = await User.find();
  const savedUser = userList[0];

  //Activate User
  await activateUser(userToken, savedUser.activationToken);

  const exercisesResponse = await getExercises(userToken);
  const exercises = exercisesResponse.body.exercises;
  const plan = {
    name: legs ? "Legs Workout" : "Arms Workout",
    groups: [
      {
        exerciseID: legs ? exercises[2]._id : exercises[0]._id,
        sets: [
          { type: "exercise", reps: 4, weight: 40 },
          { type: "rest", duration: 60 },
          { type: "exercise", reps: 6, weight: 40 },
        ],
      },
      {
        exerciseID: exercises[1]._id,
        sets: [{ type: "exercise", reps: 10, weight: 55 }],
      },
    ],
  };

  await request(app)
    .post("/api/1.0/plans")
    .send(plan)
    .set("x-auth-token", userToken);

  const savedPlan = await Plan.findOne({
    name: legs ? "Legs Workout" : "Arms Workout",
  });

  let objectPlan = savedPlan.toObject();
  const startDate = new Date(2021, 1, 30);
  const startTime = startDate.getTime();
  let currentTime = startTime;
  const newGroups = objectPlan.groups.map((group) => {
    let newGroup = { ...group };
    delete newGroup._id;
    newSets = newGroup.sets.map((set) => {
      set.startTime = currentTime;
      currentTime += 6000;
      set.endTime = currentTime;
      delete set._id;
      return set;
    });
    newGroup = { ...newGroup, sets: newSets };
    return newGroup;
  });

  const workout = {
    planID: savedPlan._id,
    startTime: startTime,
    endTime: currentTime,
    groups: newGroups,
  };

  await request(app)
    .post("/api/1.0/workouts")
    .set("x-auth-token", userToken)
    .send(workout);

  return { userToken, workout };
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  mongoose.connect(mongoServer.getUri(), {
    useUnifiedTopology: true,
  });

  const makeMuscles = () =>
    new Promise((resolve, reject) => {
      muscles.forEach(async (muscle, index, array) => {
        await request(app)
          .post("/api/1.0/muscles")
          .send({
            string: adminString,
            muscle: {
              name: muscle,
            },
          });
        if (index === array.length - 1) resolve();
      });
    });

  await makeMuscles();

  const userResponse = await request(app).post("/api/1.0/signup").send({
    username: "user",
    email: "user@mail.com",
    password: "Password1",
  });
  const userToken1 = userResponse.body.token;
  const userList1 = await User.find();
  const savedUser1 = userList1[0];

  //Activate User 1
  await activateUser(userToken1, savedUser1.activationToken);

  const bicep = await Muscle.findOne({ name: "Bicep" });
  const tricep = await Muscle.findOne({ name: "Tricep" });
  const quad = await Muscle.findOne({ name: "Quad" });
  const hamstring = await Muscle.findOne({ name: "Hamstring" });

  await request(app)
    .post("/api/1.0/exercises")
    .set("x-auth-token", userToken1)
    .send({
      name: "Curls",
      muscles: [bicep._id],
      notes: "notes",
      adminString: process.env.ADMIN_STRING,
    });

  await request(app)
    .post("/api/1.0/exercises")
    .set("x-auth-token", userToken1)
    .send({
      name: "Tricep Pushdowns",
      muscles: [tricep._id],
      notes: "notes",
      adminString: process.env.ADMIN_STRING,
    });

  await request(app)
    .post("/api/1.0/exercises")
    .set("x-auth-token", userToken1)
    .send({
      name: "Squats",
      muscles: [quad._id, hamstring._id],
      notes: "notes",
      adminString: process.env.ADMIN_STRING,
    });
});

beforeEach(async () => {
  await Workout.deleteMany({});
  await Plan.deleteMany({});
  return await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Get volume over time data", () => {
  it("returns 200 for successfully authenticated request", async () => {
    const { userToken, workout } = await createValidWorkout();

    const response = await request(app)
      .get("/api/1.0/data?type=volpersec")
      .set("x-auth-token", userToken);
    expect(response.status).toBe(200);
  });

  it("returns a data object with the volume over time on the y and start time on the x", async () => {
    const { userToken, _ } = await createValidWorkout();
    const savedPlan = await Plan.findOne({ name: "Arms Workout" });

    let objectPlan = savedPlan.toObject();
    const startDate = new Date();
    const startTime = startDate.getTime();
    let currentTime = startTime;
    const newGroups = objectPlan.groups.map((group) => {
      let newGroup = { ...group };
      delete newGroup._id;
      newSets = newGroup.sets.map((set) => {
        set.startTime = currentTime;
        currentTime += 6000;
        set.endTime = currentTime;
        delete set._id;
        return set;
      });
      newGroup = { ...newGroup, sets: newSets };
      return newGroup;
    });

    const workout = {
      planID: savedPlan._id,
      startTime: startTime,
      endTime: currentTime,
      groups: newGroups,
    };

    await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(workout);

    const exercise = await Exercise.findOne({ name: "Curls" });
    const response = await request(app)
      .get(`/api/1.0/data?type=volpersec&exercise=${exercise._id}`)
      .set("x-auth-token", userToken);

    let volume1 = 0;
    savedPlan.groups[0].sets.forEach((set) => {
      if (set.type === "exercise") {
        volume1 += set.weight * set.reps;
      }
    });

    expect(response.body.y[0]).toBe(volume1 / 18);
    expect(response.body.y.length).toBe(2);
    expect(response.body.x.length).toBe(2);
  });

  it("returns object with correct number of workouts for user ", async () => {
    const { userToken, _ } = await createValidWorkout(true);

    const exercisesResponse = await getExercises(userToken);
    const exercises = exercisesResponse.body.exercises;

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercises[0]._id,
          sets: [
            { type: "exercise", reps: 4, weight: 40 },
            { type: "rest", duration: 60 },
            { type: "exercise", reps: 6, weight: 40 },
          ],
        },
        {
          exerciseID: exercises[1]._id,
          sets: [{ type: "exercise", reps: 10, weight: 55 }],
        },
      ],
    };

    await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken);

    const savedPlan = await Plan.findOne({ name: "Arms Workout" });

    let objectPlan = savedPlan.toObject();
    const startDate = new Date();
    const startTime = startDate.getTime();
    let currentTime = startTime;
    const newGroups = objectPlan.groups.map((group) => {
      let newGroup = { ...group };
      delete newGroup._id;
      newSets = newGroup.sets.map((set) => {
        set.startTime = currentTime;
        currentTime += 6000;
        set.endTime = currentTime;
        delete set._id;
        return set;
      });
      newGroup = { ...newGroup, sets: newSets };
      return newGroup;
    });

    const workout = {
      planID: savedPlan._id,
      startTime: startTime,
      endTime: currentTime,
      groups: newGroups,
    };

    await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(workout);

    const exercise = await Exercise.findOne({ name: "Curls" });
    const response = await request(app)
      .get(`/api/1.0/data?type=volpersec&exercise=${exercise._id}`)
      .set("x-auth-token", userToken);

    expect(response.body.y.length).toBe(1);
    expect(response.body.x.length).toBe(1);
  });

  it("returns Not authenticated if user is not authenticated", async () => {
    await createValidWorkout();

    const response = await request(app)
      .get("/api/1.0/data?type=volpersec")
      .set("x-auth-token", "fdsafeqwfeqw");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Not authenticated");
  });
});
