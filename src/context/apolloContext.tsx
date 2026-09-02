import React, { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { useAnilistContext } from "@/context/anilistContext";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const ENV = process.env.APPLICATION_ENVIRONMENT;
const ANILIST_GRAPHQL_URI = "https://graphql.anilist.co";

const GraphqlContext = createContext<undefined>(undefined);

export const useGraphqlContext = () => {
  const context = useContext(GraphqlContext);
  if (!context) {
    throw new Error("useGraphqlContext must be used within a application provider");
  }
  return context;
};

export const GraphqlProvider = ({ children }: PropsWithChildren<unknown>) => {
  const { anilistAuth } = useAnilistContext();
  const accessToken = anilistAuth?.access_token;

  const client = useMemo(() => {
    const httpLink = createHttpLink({
      uri: ANILIST_GRAPHQL_URI,
    });

    const authLink = setContext((_, { headers }) => {
      return {
        headers: {
          ...headers,
          authorization: accessToken ? `Bearer ${accessToken}` : "",
        },
      };
    });

    return new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      connectToDevTools: ENV === "dev" ? true : false,
    });
  }, [accessToken]);

  return (
    <GraphqlContext.Provider value={undefined}>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </GraphqlContext.Provider>
  );
};
