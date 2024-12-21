import { gql } from "graphql-request"

export const getShopifyProducts = gql`
  query getShopifyProducts($first: Int!, $after: String, $query: String)
    {
      products(first: $first, after: $after, query: $query) {
        pageInfo {
          hasNextPage
          endCursor
          hasPreviousPage
          startCursor
        }
        edges {
          node {
            id
            title
            description
            featuredImage {
              id
              url
            }
            variants(first: 3) {
              edges {
                node {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  
`

export const getShopifyCollections = gql`
    query getShopifyCollections($first: Int!, $after: String, $query: String)
        {
        collections(first: $first, after: $after, query: $query) {
            pageInfo {
            hasNextPage
            endCursor
            hasPreviousPage
            startCursor
            }
            edges {
            node {
                id
                title
                description
                image {
                    url
                    }
                }
            }
        }
      }
    `
