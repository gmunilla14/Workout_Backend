const request = require("supertest");
const app = require("../app");
const User = require("../models/User");
const sequelize = require("../config/database");
const jwt = require("jsonwebtoken");

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

const username_null = "Username cannot be null";
const username_size = "Username must have min 3 and max 32 characters";
const email_null = "Email cannot be null";
const email_invalid = "Email is not valid";
const password_null = "Password cannot be null";
const password_size = "Password must be at least 6 characters";
const password_pattern =
  "Password must have at least 1 uppercase, 1 lowercase letter and 1 number";

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

  it("saves the user with username, email, and password to the database", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(defaultUser.username);
    expect(savedUser.email).toBe(defaultUser.email);
    expect(savedUser.password).toBeTruthy();
  });

  it("hashes the password in the database", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe(defaultUser.password);
  });

  it("creates the user in inactive mode", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(true);
  });

  it("creates user in inactive mode even if post is set to inactive false", async () => {
    let user = { ...defaultUser, inactive: false };
    await postUser(user);
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(true);
  });

  it("creates user with activation token", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it("returns a JWT token with id, username, and email on successful creation", async () => {
    const response = await postUser();
    const returnedToken = response.body.token;
    const decoded = jwt.decode(returnedToken);
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(decoded.id).toBe(savedUser.id);
    expect(decoded.username).toBe(defaultUser.username);
    expect(decoded.email).toBe(defaultUser.email);
  });

  it.each([
    ["username", null, username_null],
    ["username", "usr", username_size],
    ["username", "a".repeat(33), username_size],
    ["email", null, email_null],
    ["email", "mail.com", email_invalid],
    ["email", "user.mail.com", email_invalid],
    ["email", "user@mail", email_invalid],
    ["password", null, password_null],
    ["password", "Asdfg", password_size],
    ["password", "alllowercase", password_pattern],
    ["password", "ALLUPPERCASE", password_pattern],
    ["password", "12344567", password_pattern],
    ["password", "fdafa12344567", password_pattern],
    ["password", "lowerUPPER", password_pattern],
    ["password", "UPPER1234", password_pattern],
  ])(
    "when %s is %s, return %s is received",
    async (field, value, expectedMessage) => {
      let user = defaultUser;

      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it("returns two validation errors when username and email are null", async () => {
    let user = { ...defaultUser, username: null, email: null };
    const response = await postUser(user);
    expect(response.body.validationErrors[username]).toBe(username_null);
    expect(response.body.validationErrors[email]).toBe(email_null);
  });
});
