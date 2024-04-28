import React, { createContext, PropsWithChildren, useContext } from "react";
import { useAnilistContext } from "@/context/anilistContext";
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

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

  const httpLink = createHttpLink({
    uri: ANILIST_GRAPHQL_URI,
  });

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: anilistAuth?.access_token ? `Bearer ${anilistAuth?.access_token}` : "",
      },
    };
  });

  const client = new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(),
  });

  return (
    <GraphqlContext.Provider value={undefined}>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </GraphqlContext.Provider>
  );
};
