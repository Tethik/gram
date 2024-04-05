import { api } from "./api";
import { setAuthToken } from "./util/authToken";

const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAuthParams: build.query({
      query: () => `/auth/params`,
      transformResponse: (response) => response,
    }),
    getGramToken: build.mutation({
      query: ({ provider, params }) => ({
        url: `/auth/token`,
        method: "POST",
        params: {
          provider,
        },
        body: {
          ...params,
        },
      }),
      transformResponse: (response) => {
        if (response.status === "ok") {
          setAuthToken(response.token);
        }
        return {
          status: response.status,
          authenticated: response.status === "ok",
          message: response.message,
        };
      },
      invalidatesTags: ["User"],
    }),
    logout: build.mutation({
      query: () => ({
        url: `/auth/token`,
        method: "DELETE",
      }),
      transformResponse: (response) => {
        setAuthToken(null);
        return { authenticated: false };
      },
      invalidatesTags: ["User"],
    }),
  }),
});

export const {
  useGetAuthParamsQuery,
  useGetUserQuery,
  useGetGramTokenMutation,
  useLogoutMutation,
} = authApi;
