# Ownership Server

[![Coverage Status](https://coveralls.io/repos/github/decentraland/ownership-server/badge.svg?branch=coverage)](https://coveralls.io/github/decentraland/ownership-server?branch=coverage)

The ownership server was designed to expose an API that resolves NFT ownership, acting as an intermediary between a database hosting ownership data (such as Substreams or Subsquid) and a consumer, like a Catalyst node. This approach reduces reliance on services like The Graph or Satsuma, enhancing ownership validation time.
