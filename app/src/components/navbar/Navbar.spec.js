import { cleanup, render } from "@testing-library/react";
import React from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router } from "react-router-dom";
import { createMockStore } from "redux-test-utils";
import { MockTheme } from "../../MockTheme";
import { Navbar } from "./Navbar";

jest.mock("../../api/gram/menu", () => ({
  ...jest.requireActual("react-redux"),
  useGetMenuQuery: jest.fn(() => ({ isLoading: false, data: [] })),
}));

jest.mock("../../api/gram/auth", () => ({
  ...jest.requireActual("react-redux"),
  useGetUserQuery: jest.fn(() => ({ data: { sub: "test", roles: ["user"] } })),
  useLogoutMutation: jest.fn(() => [jest.fn()]),
}));

const store = createMockStore({
  navbar: { troll: "no" },
  user: { picture: "", name: "testname" },
  login: { authenticated: true },
  auth: { authenticated: true },
});

const renderComponent = (props) =>
  render(
    <Provider store={store}>
      <Router>
        <MockTheme>
          <Navbar {...props} />
        </MockTheme>
      </Router>
    </Provider>
  );

describe("Navbar", () => {
  it.skip("renders Navbar", () => {
    expect(renderComponent()).toMatchSnapshot();
  });

  afterAll(() => {
    cleanup();
  });
});
