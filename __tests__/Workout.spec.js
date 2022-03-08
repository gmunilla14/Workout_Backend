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

const getExercises = async (userToken) => {
  return await request(app)
    .get("/api/1.0/exercises")
    .set("x-auth-token", userToken);
};

const createValidWorkout = async () => {
  //Create User
  const userToken = await createUser();
  const userList = await User.find();
  const savedUser = userList[0];

  //Activate User
  await activateUser(userToken, savedUser.activationToken);

  const exercisesResponse = await getExercises(userToken);
  const exercises = exercisesResponse.body.exercises;

  const plan = {
    name: "Arms Workout",
    groups: [
      {
        exerciseID: exercises[0]._id,
        sets: [
          { type: "exercise", reps: 8, weight: 40 },
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
  const startDate = new Date(2020, 1, 30);
  const startTime = startDate.getTime();
  let currentTime = startTime;
  const newGroups = objectPlan.groups.map((group) => {
    let newGroup = { ...group };
    newSets = newGroup.sets.map((set) => {
      set.startTime = currentTime;
      currentTime += 6000;
      set.endTime = currentTime;
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

describe("Create workouts", () => {
  it("returns 200 status when correctly sent", async () => {
    const { userToken, workout } = await createValidWorkout();

    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(workout);

    expect(response.status).toBe(200);
  });

  it("returns Workout created when correctly sent", async () => {
    const { userToken, workout } = await createValidWorkout();

    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(workout);

    expect(response.body.message).toBe("Workout created");
  });

  it("creates workout in database", async () => {
    const { userToken, workout } = await createValidWorkout();

    await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(workout);

    const workouts = await Workout.find();

    expect(workouts.length).toBe(1);
  });

  it("creates workout in database with correct fields", async () => {
    const { userToken, workout } = await createValidWorkout();

    await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(workout);

    const savedWorkout = await Workout.findOne({});
    const savedPlan = await Plan.findOne({});
    const savedUser = await User.findOne({ username: "user" });
    const bicep = await Muscle.findOne({ name: "Bicep" });
    const tricep = await Muscle.findOne({ name: "Tricep" });

    expect(savedWorkout.planID).toBe(savedPlan._id);
    expect(savedWorkout.uid).toBe(savedUser._id);
    expect(savedWorkout.startTime).toBe(new Date(2020, 1, 30).getTime());
    expect(savedWorkout.groups.length).toBe(2);
    expect(savedWorkout.groups[0].exerciseID).toBe(bicep._id);
    expect(savedWorkout.groups[0].sets.length).toBe(3);
    expect(savedWorkout.groups[1].exerciseID).toBe(tricep._id);
    expect(savedWorkout.groups[1].sets.length).toBe(1);
  });

  it("returns status 401 when user is not authenticated", async () => {
    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", "fdsafda")
      .send({});

    expect(response.status).toBe(401);
  });

  it("returns Not authenticated when user is not authenticated", async () => {
    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", "fdsadsafa")
      .send({});

    expect(response.body.message).toBe("Not authenticated");
  });

  it("returns status 403 when user is not active", async () => {
    const userToken = await createUser();

    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send({});

    expect(response.status).toBe(403);
  });

  it("returns User inactive when user is not active", async () => {
    const userToken = await createUser();

    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send({});

    expect(response.body.message).toBe("User inactive");
  });

  it("returns Invalid plan when invalid plan ID is given", async () => {
    const { userToken, workout } = await createValidWorkout();

    const newWorkout = { ...workout, planID: "fdwfeaf" };
    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(newWorkout);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid plan");
  });

  it("returns Invalid time input when start time is after end", async () => {
    const { userToken, workout } = await createValidWorkout();

    const newWorkout = {
      ...workout,
      startTime: workout.endTime,
      endTime: workout.startTime,
    };
    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(newWorkout);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid time input");
  });

  it("returns Invalid time input when set with earlier time is after another", async () => {
    const { userToken, workout } = await createValidWorkout();

    const newGroups = [...workout.groups];
    console.log(newGroups);

    let group = newGroups[0];
    let groupSets = group.sets;
    groupSets = [groupSets[0], groupSets[2], groupSets[1]];
    group = { ...group, sets: groupSets };
    const newWorkout = {
      ...workout,
      groups: [group, newGroups[1]],
    };

    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(newWorkout);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid time input");
  });

  it("returns Invalid time input when group with earlier time is after another", async () => {
    const { userToken, workout } = await createValidWorkout();

    const newGroups = [...workout.groups];
    console.log(newGroups);

    let group = newGroups[1];
    let set = group.sets[0];
    set = {
      ...set,
      startTime: set.startTime - 600000,
      endTime: set.endTime - 600000,
    };

    group = { ...group, sets: [set] };
    const newWorkout = {
      ...workout,
      groups: [newGroups[0], group],
    };

    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(newWorkout);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid time input");
  });

  it("returns Invalid exercise when incorrect exercise ID is given", async () => {
    const { userToken, workout } = await createValidWorkout();

    const newGroups = [...workout.groups];

    let group = { ...newGroups[1], exerciseID: "fdafdqwfw" };

    let newWorkout = { ...workout, groups: [newGroups[0], group] };
    const response = await request(app)
      .post("/api/1.0/workouts")
      .set("x-auth-token", userToken)
      .send(newWorkout);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid exercise");
  });
});
