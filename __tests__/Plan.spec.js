const request = require("supertest");
const app = require("../app");
const { Exercise } = require("../models/Exercise");
const { User } = require("../models/User");
const { Muscle } = require("../models/Muscle");
const { Plan } = require("../models/Plan");
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
});

beforeEach(async () => {
  await Plan.deleteMany({});
  await User.deleteMany({});
  return await Exercise.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

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

describe("Create workout plans", () => {
  it("returns 200 status if valid plan is send by active user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);
    expect(response.status).toBe(200);
  });

  it("returns Plan created if valid plan is send by active user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);
    expect(response.body.message).toBe("Plan created");
  });

  it("creates plan in databse with relevant fields", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });
    const tricep = await Muscle.findOne({ name: "Tricep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);
    await createExercise("Tricep Pushdowns", [tricep._id], "notes", userToken1);

    const exercise1 = await Exercise.findOne({ name: "Curls" });
    const exercise2 = await Exercise.findOne({ name: "Tricep Pushdowns" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise1._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
        {
          exerciseID: exercise2._id,
          sets: [{ type: "exercise", reps: 10, weight: 55 }],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);

    const savedPlan = await Plan.findOne({ name: "Arms Workout" });
    expect(savedPlan.name).toBe("Arms Workout");
    expect(savedPlan.creatorID).toBe(String(savedUser1._id));
    expect(savedPlan.groups.length).toBe(2);
    expect(savedPlan.groups[0].exerciseID).toBe(String(exercise1._id));
    expect(savedPlan.groups[0].sets.length).toBe(3);
    expect(savedPlan.groups[1].sets.length).toBe(1);
  });
  it("returns Not authenticated if user is not authenticated", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", "fej3wiofewj");
    expect(response.body.message).toBe("Not authenticated");
  });

  it("returns 401 status if user is not authenticated", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });
    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };
    const response = await request(app)
      .post("/api/1.0/plans")
      .set("x-auth-token", "fej3wiofewj")
      .send(plan);

    expect(response.status).toBe(401);
  });

  it.each([
    ["name", null],
    ["name", ""],
    ["name", "a".repeat(101)],
    ["groups", []],
    ["exerciseID", null],
    ["exerciseID", "fewqef"],
    ["type", "fds"],
    ["type", 23],
    ["weight", "fjk"],
    ["reps", "re2wf"],
    ["duration", "fwwf"],
  ])(
    "when %s is %s, return Invalid plan input with status 400",
    async (field, value) => {
      const bicep = await Muscle.findOne({ name: "Bicep" });

      const userToken1 = await createUser();
      const userList1 = await User.find();
      const savedUser1 = userList1[0];

      //Activate User 1
      await activateUser(userToken1, savedUser1.activationToken);

      //Create User 1 exercise
      await createExercise("Curls", [bicep._id], "notes", userToken1);

      const exercise = await Exercise.findOne({ name: "Curls" });

      let plan = {
        name: "Arms Workout",
        groups: [
          {
            exerciseID: exercise._id,
            sets: [
              { type: "exercise", reps: 8, weight: 45 },
              { type: "rest", duration: 60 },
              {
                type: "exercise",
                reps: 8,
                weight: 45,
              },
            ],
          },
        ],
      };

      if (field === "exerciseID") {
        let newGroups = [...plan.groups];
        newGroups[0].exerciseID = value;
        plan = { ...plan, groups: newGroups };
      } else if (field === "type") {
        let newGroups = [...plan.groups];
        let group = newGroups[0];
        let newSets = [...group.sets];
        newSets[2].type = value;
        newGroups = [group];
        plan = { ...plan, groups: newGroups };
      } else if (field === "weight") {
        let newGroups = [...plan.groups];
        let group = newGroups[0];
        let newSets = [...group.sets];
        newSets[2].weight = value;
        newGroups = [group];
        plan = { ...plan, groups: newGroups };
      } else if (field === "reps") {
        let newGroups = [...plan.groups];
        let group = newGroups[0];
        let newSets = [...group.sets];
        newSets[2].reps = value;
        newGroups = [group];
        plan = { ...plan, groups: newGroups };
      } else if (field === "duration") {
        let newGroups = [...plan.groups];
        let group = newGroups[0];
        let newSets = [...group.sets];
        newSets[1].duration = value;
        newGroups = [group];
        plan = { ...plan, groups: newGroups };
      } else {
        plan[field] = value;
      }

      const response = await request(app)
        .post("/api/1.0/plans")
        .set("x-auth-token", userToken1)
        .send(plan);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid plan input");
    }
  );

  it("returns Invalid plan input if rest has reps", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", reps: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid plan input");
  });

  it("returns Invalid plan input if rest has weight", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", duration: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid plan input");
  });

  it("returns Invalid plan input if sets are empty", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [],
        },
      ],
    };

    const response = await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid plan input");
  });
});

const getPlans = async (userToken) => {
  return await request(app)
    .get("/api/1.0/plans")
    .set("x-auth-token", userToken);
};

describe("Get Plans", () => {
  it("returns 200 when successful", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);

    const response = await getPlans(userToken1);
    expect(response.status).toBe(200);
  });

  it("returns only plans created by user", async () => {
    const bicep = await Muscle.findOne({ name: "Bicep" });

    const userToken1 = await createUser();
    const userList1 = await User.find();
    const savedUser1 = userList1[0];

    //Activate User 1
    await activateUser(userToken1, savedUser1.activationToken);

    //Create User 1 exercise
    await createExercise("Curls", [bicep._id], "notes", userToken1);

    const exercise = await Exercise.findOne({ name: "Curls" });

    const plan = {
      name: "Arms Workout",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    const userToken2 = await request(app).post("/api/1.0/signup").send({
      username: "user2",
      email: "user2@mail.com",
      password: "Password1",
    });
    const userList2 = await User.find({ username: "user2" });
    const savedUser2 = userList2[0];

    //Activate User 1
    await activateUser(userToken2, savedUser2.activationToken);

    const plan2 = {
      name: "Arms Workout 2",
      groups: [
        {
          exerciseID: exercise._id,
          sets: [
            { type: "exercise", reps: 8, weight: 45 },
            { type: "rest", duration: 60 },
            {
              type: "exercise",
              reps: 8,
              weight: 45,
            },
          ],
        },
      ],
    };

    await request(app)
      .post("/api/1.0/plans")
      .send(plan)
      .set("x-auth-token", userToken1);

    await request(app)
      .post("/api/1.0/plans")
      .send(plan2)
      .set("x-auth-token", userToken2);

    const response = await getPlans(userToken1);

    expect(response.body.plans.length).toBe(1);
    expect(response.body.plans[0].creatorID).toBe(String(savedUser1._id));
  });

  it("returns status 401 if not authenticated", async () => {
    const response = await request(app)
      .get("/api/1.0/plans")
      .set("x-auth-token", "fdsewfe");

    expect(response.status).toBe(401);
  });

  it("returns Not authenticated if not authenticated", async () => {
    const response = await request(app)
      .get("/api/1.0/plans")
      .set("x-auth-token", "fdsewfe");

    expect(response.body.message).toBe("Not authenticated");
  });

  it("returns status 403 if the user is inactive", async () => {
    const userToken1 = await createUser();

    const response = await getPlans(userToken1);
    expect(response.status).toBe(403);
  });

  it("returns User inactive if the user is inactive", async () => {
    const userToken1 = await createUser();

    const response = await getPlans(userToken1);
    expect(response.body.message).toBe("User inactive");
  });
});
