const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const sequelize = require("../config/database");

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const defaultUser = {
  username: "user1",
  email: "user1@mail.com",
  password: "Password1",
};

const postUser = (user = defaultUser) => {
  return request(app).post("/api/1.0/signup").send(user);
};

describe("Sign Up User", () => {
  it("returns 200 status when sending valid signup request", async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it("returns success message on successful signup", async () => {
    const response = await postUser();
    expect(response.body.message).toBe("User created");
  });

  it("saves the user to the database", async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it("saves the user with username, email, and password and email to the database", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(defaultUser.username);
    expect(savedUser.email).toBe(defaultUser.email);
    expect(savedUser.password).toBeTruthy();
  });

  it("hashes the password in the database", async () => {
    await postUser();
    const savedUser = await User.findAll()[0];
    expect(savedUser.password).not.toBe(defaultUser.password);
  });
});
