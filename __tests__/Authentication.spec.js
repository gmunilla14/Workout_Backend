const request = require("supertest");
const app = require("../app");
const { User } = require("../models/User");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  mongoose.connect(mongoUri, {
    useUnifiedTopology: true,
  });
});

beforeEach(() => {
  return User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const defaultUser = {
  username: "user1",
  email: "user1@mail.com",
  password: "Password1",
};

const adminString = process.env.ADMIN_STRING;

const username_null = "Username is required";
const username_size = "Username must have min 3 and max 32 characters";
const email_null = "Email is required";
const email_invalid = "Email is not valid";
const password_null = "Password is required";
const password_size =
  "Password must be at least 6 characters and at most 32 characters";
const password_pattern =
  "Password must have at least 1 uppercase, 1 lowercase letter and 1 number";

const postUser = (user = defaultUser) => {
  return request(app).post("/api/1.0/signup").send(user);
};

const signInUser = (user = defaultUser) => {
  return request(app)
    .post("/api/1.0/signin")
    .send({ email: user.email, password: user.password });
};

const activateAccount = (activationToken, jwtToken) => {
  return request(app)
    .post("/api/1.0/activate")
    .set("x-auth-token", jwtToken)
    .send({ token: activationToken });
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
    const userList = await User.find();
    expect(userList.length).toBe(1);
  });

  it("saves the user with username, email, and password to the database", async () => {
    await postUser();
    const userList = await User.find();
    const savedUser = userList[0];
    expect(savedUser.username).toBe(defaultUser.username);
    expect(savedUser.email).toBe(defaultUser.email);
    expect(savedUser.password).toBeTruthy();
  });

  it("hashes the password in the database", async () => {
    await postUser();
    const userList = await User.find();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe(defaultUser.password);
  });

  it("creates the user in inactive mode", async () => {
    await postUser();
    const userList = await User.find();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(true);
  });

  it("creates user in inactive mode even if post is set to inactive false", async () => {
    let user = { ...defaultUser, inactive: false };
    await postUser(user);
    const userList = await User.find();
    const savedUser = userList[0];
    expect(savedUser.inactive).toBe(true);
  });

  it("creates user with activation token", async () => {
    await postUser();
    const userList = await User.find();
    const savedUser = userList[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it("returns a JWT token with id, username, email, and inactive status on successful creation", async () => {
    const response = await postUser();
    const returnedToken = response.body.token;
    const decoded = jwt.decode(returnedToken);

    const userList = await User.find();
    const savedUser = userList[0];
    expect(decoded.id).toBe(savedUser.id);
    expect(decoded.username).toBe(defaultUser.username);
    expect(decoded.email).toBe(defaultUser.email);
    expect(decoded.inactive).toBe(true);
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
    ["password", "Asdf2", password_size],
    ["password", "Ad3".repeat(11), password_size],
    ["password", "alllowercase", password_pattern],
    ["password", "ALLUPPERCASE", password_pattern],
    ["password", "12344567", password_pattern],
    ["password", "fdafa12344567", password_pattern],
    ["password", "lowerUPPER", password_pattern],
    ["password", "UPPER1234", password_pattern],
  ])(
    "when %s is %s, return %s is received",
    async (field, value, expectedMessage) => {
      let user = { ...defaultUser };

      user[field] = value;
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it("returns two validation errors when username and email are null", async () => {
    let user = { ...defaultUser, username: null, email: null };
    const response = await postUser(user);
    expect(response.body.validationErrors["username"]).toBe(username_null);
    expect(response.body.validationErrors["email"]).toBe(email_null);
  });
});

describe("Account Activation", () => {
  it("returns 200 status when account is successfully activated", async () => {
    //Create New User
    const postResponse = await postUser(defaultUser);
    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    const response = await activateAccount(
      savedUser.activationToken,
      postResponse.body.token
    );
    expect(response.status).toBe(200);
  });

  it("returns Account activated when account is successfully activated", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    const response = await activateAccount(
      savedUser.activationToken,
      postResponse.body.token
    );
    expect(response.body.message).toBe("Account activated");
  });

  it("removes activation token and sets user to active when account is successfully activated", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    await activateAccount(savedUser.activationToken, postResponse.body.token);

    //Get updated activated user
    const newUserList = await User.find();
    const updatedUser = newUserList[0];
    expect(updatedUser.activationToken).not.toBeTruthy();
    expect(updatedUser.inactive).toBe(false);
  });

  it("returns status 401 if jwttoken is not correct", async () => {
    //Create new user
    await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Attempt activation with invalid jwt token
    const response = await activateAccount(
      savedUser.activationToken,
      "fake-token"
    );
    expect(response.status).toBe(401);
  });

  it("returns Not authenticated if jwttoken is not correct", async () => {
    //Create new user
    await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Attempt activation with invalid jwt token
    const response = await activateAccount(
      savedUser.activationToken,
      "fake-token"
    );
    expect(response.body.message).toBe("Not authenticated");
  });

  it("returns status 400 if incorrect activation token is sent", async () => {
    //Create new user
    const postResponse = await postUser();

    //Attempt activation on user with incorrect activation token
    const response = await activateAccount(
      "efwfwafqwfewq",
      postResponse.body.token
    );
    expect(response.status).toBe(400);
  });

  it("returns Invalid activation request if incorrect activation token is sent", async () => {
    //Create new user
    const postResponse = await postUser();

    //Attempt activation on user with incorrect activation token
    const response = await activateAccount(
      "fdsawwfewe",
      postResponse.body.token
    );
    expect(response.body.message).toBe("Invalid activation request");
  });

  it("returns updated JWT token on successful activation", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    const response = await activateAccount(
      savedUser.activationToken,
      postResponse.body.token
    );

    const decoded = jwt.decode(response.body.token);
    expect(decoded.id).toBe(savedUser.id);
    expect(decoded.username).toBe(defaultUser.username);
    expect(decoded.email).toBe(defaultUser.email);
    expect(decoded.inactive).toBe(false);
  });
});

describe("Sign In User", () => {
  it("returns status 200 on successful sign in to active account", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    await activateAccount(savedUser.activationToken, postResponse.body.token);

    //Sign in as new user
    const response = await signInUser();
    expect(response.status).toBe(200);
  });

  it("returns JWT token with id, username, email and inactive status on successful sign in to active account", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    await activateAccount(savedUser.activationToken, postResponse.body.token);

    //Sign in new user
    const response = await signInUser();
    const decoded = jwt.decode(response.body.token);
    expect(decoded.id).toBe(savedUser.id);
    expect(decoded.username).toBe(defaultUser.username);
    expect(decoded.email).toBe(defaultUser.email);
    expect(decoded.inactive).toBe(false);
  });

  it("returns status 400 when incorrect password is sent to active account", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    await activateAccount(savedUser.activationToken, postResponse.body.token);

    //Attempt to sign in with incorrect password
    const user = { ...defaultUser, password: "incorrectps" };
    const response = await signInUser(user);
    expect(response.status).toBe(400);
  });

  it("returns Invalid email or password when incorrect password is sent to active account", async () => {
    //Create new user
    const postResponse = await postUser();

    //Get new user
    const userList = await User.find();
    const savedUser = userList[0];

    //Activate new user
    await activateAccount(savedUser.activationToken, postResponse.body.token);

    //Attempt to sign in with incorrect password
    const user = { ...defaultUser, password: "incorrectps" };
    const response = await signInUser(user);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("returns status 400 when unused email is sent", async () => {
    const response = await signInUser();
    expect(response.status).toBe(400);
  });

  it("returns Invalid email or password when unused email is sent", async () => {
    const response = await signInUser();
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("returns 403 status when user is inactive", async () => {
    await postUser();
    const response = await signInUser();
    expect(response.status).toBe(403);
  });

  it("returns User is inactive when user is inactive", async () => {
    await postUser();
    const response = await signInUser();
    expect(response.body.message).toBe("User is inactive");
  });
});

describe("Delete User", () => {
  it("returns 401 status when incorrectly authenticated", async () => {
    await postUser();
    const response = await request(app)
      .delete("/api/1.0/users")
      .set("x-auth-token", "fdasfdsafdsa")
      .send({ adminString });

    expect(response.status).toBe(401);
  });

  it("returns 401 status when adminString is not included", async () => {
    const userResponse = await postUser();
    const response = await request(app)
      .delete("/api/1.0/users")
      .set("x-auth-token", userResponse.body.token)
      .send({});

    expect(response.status).toBe(401);
  });

  it("returns 401 status when adminString is incorrect", async () => {
    const userResponse = await postUser();
    const response = await request(app)
      .delete("/api/1.0/users")
      .set("x-auth-token", userResponse.body.token)
      .send({ adminString: "afjklfwefje" });

    expect(response.status).toBe(401);
  });

  it("returns 200 status when correctly authenticated", async () => {
    const userResponse = await postUser();
    const response = await request(app)
      .delete("/api/1.0/users")
      .set("x-auth-token", userResponse.body.token)
      .send({ adminString });

    expect(response.status).toBe(200);
  });

  it("removes user from the database", async () => {
    const userResponse = await postUser();
    await request(app)
      .delete("/api/1.0/users")
      .set("x-auth-token", userResponse.body.token)
      .send({ adminString });

    const userList = await User.find();

    expect(userList.length).toBe(0);
  });
});

describe("Get user activation token", () => {
  it("provides activation token for authenticated user", async () => {
    const userResponse = await postUser();
    const response = await request(app)
      .get("/api/1.0/token")
      .set("x-auth-token", userResponse.body.token);

    const userList = await User.find();
    const user = userList[0];
    expect(response.body.token).toBe(user.activationToken);
  });
});
