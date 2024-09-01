# Nullable Infrastructure Kata

## Introduction

This is an implementation of the [Unusual Spending kata](https://github.com/testdouble/contributing-tests/wiki/Unusual-Spending-Kata)
using James Shore's [Nullable Infrastructure pattern](https://www.jamesshore.com/v2/projects/nullables).
The Nullable Infrastructure pattern is an alternative approach to using [mock
objects](https://martinfowler.com/articles/mocksArentStubs.html) inside tests.

The basic idea is that objects that cause side effects have a kind of an "off
switch". With this we can turn off any interaction with the outside world that
these objects normally have. That way we can use the real objects as
collaborators in our tests and don't have to replace them with mock objects or
other test doubles. An object with this kind of switch is called a "Nullable"
and in its off-state it is called a null-object. (This by the way has nothing to
do with the notion of `null` or a null-pointer.)

We strictly separate all side effects (or "infrastructure") from the core domain
(or business) logic which is completely free of side effects or in other words
"pure". Side effects are all interactions with state that is outside of our
system. They include access to global state like date/time or random number
generators, reading and writing files on disk, network communication, database
queries, third party APIs, and so on.

This separation is at the heart of various architectural patterns like for
example the Hexagonal Architecture (TODO link) which lends itself very well to
the Nullable Infrastructure pattern. In a nutshell Hexagonal Architecture
defines a domain core which is pure. This core then interacts with the outside
world via ports that are then connected to adapaters that implement the concrete
side effects. Using Nullable Infrastructure for implementing these adapters is a
perfect fit.

## The "Unusual Spending" kata

The task of the Unusual Spending kata is to implement a system that (given a
customer ID) fetches two lists of payments a single customer made. One of the
current month and one of the previous month. In both lists the payment amounts
have to be summed up by payment category. If there is an increase of more than
50% in a category from the previous month to the current month then this is
regarded an unusual spending. If one or more unusual spendings are detected then
the system should send an email to the customer in question, informing them
about the potential issue.

The pure domain logic in this case is the code that sums up the amounts by
category and compares them. The infrastructure consists of a calendar (to read
the current month), an API to load the lists of payments, and an email service
that can send an email by talking to an SMTP server. Notice that the UI part is
out of the scope of this kata.

[![Hexagon](./hexagon.png)](https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=Unusual%20Spending%20Hexagon.drawio#R%3Cmxfile%3E%3Cdiagram%20name%3D%22Page-1%22%20id%3D%22TCG4UKSa01HB5v_6KEIQ%22%3E7VfbbpwwEP0aHlNx3ctjs2zTSqmCtIqaPlrLBFwBRl6zQL%2B%2B9jIGXNpNmouWhz7hOR5f5pwZBixvkzc3nJTpVxZDZrl23FheaLmu43u%2BfCik7ZDlatUBCacxOg3Ajv4EBG1EKxrDwXAUjGWClia4Z0UBe2FghHNWm26PLDNPLUkCE2C3J9kU%2FUZjkXboKrAH%2FDPQJNUnOzbO5EQ7I3BISczqEeRtLW%2FDGRPdKG82kCnyNC%2Fduk9%2Fme0vxqEQz1lwtY7q6D6s7m6b7I6JNvRbcrXEu4lWBwyxjB9NxkXKElaQbDug15xVRQxqV1tag88tY6UEHQn%2BACFaFJNUgkkoFXmGs9BQ8TAaf1dbfVgGaIYNbn0yWjSm4SIDB1bxPZyJUacN4QmIM36YqYqA0QFI5g2wHARvpQOHjAh6NBOEYJ4lvd8ghRygGv%2BgzOoiyhTy6g%2BafmV02gTaHLQ5We1IqRkqGsxK0fV%2FRV%2Bt6GJWiuK%2BR5JVeFLIckKLidDy3V%2BqYQoNkfpJqkrgVF4C%2BIBGGpIBXdcpFbAryYm1WvZWU9ZH2oDulso%2BdMPgrApH4AKas7zhrKu7mO7aaNZDC%2Bxd0lH768E3p9qbU%2FG4T1XPywvBfWYhOLMqBHdSCPdfJoKZcjyR4G%2BQxL6Zw%2F40hx33Dzm8eK8U9ickbeRnZhETfnmqliZXTnBpsoIJWRFpcxWha3%2BMZpBcvzHWf%2BZfjLHFhLGt7EVq2Q74kUoqZsfZ%2Bv04k%2Bbwa3WaG%2F2gettf%3C%2Fdiagram%3E%3C%2Fmxfile%3E)

## The Nullable Infrastructure implementation

It demonstrates the use of

- Configurable responses
- Output tracking
- Parameterless instantiation
- Embedded stubs
- Narrow sociable tests
- State-based tests
- Zero-impact instantiation (?)
- Narrow integration tests (?)
- Paranoic telemetry
- Nullables

[![Class diagram](./class_diagram.png)](https://viewer.diagrams.net/?tags=%7B%7D&lightbox=1&highlight=0000ff&edit=_blank&layers=1&nav=1&title=Unusual%20Spending.drawio#R%3Cmxfile%3E%3Cdiagram%20name%3D%22Page-1%22%20id%3D%22Kcyi-Vj68U4RgMjqVgWU%22%3E7Zxbc5s4FIB%2FjWfSh%2BwY4%2Btj7CTb3Ul33Lid7u6bbGRQK5ArRGz31%2FcIxM3gW2LA29VMLnAQWOh8OhcdcMucuJvfOVo5H5iFaavTtjYt877V6Rhdswv%2FpGQbSQbDYSSwObFUo1QwIz%2BwEraVNCAW9nMNBWNUkFVeuGCehxciJ0Ocs3W%2B2ZLR%2FKeukI0LgtkC0aL0C7GEE0mHvXYqf4%2BJ7cSfbLTVERfFjZXAd5DF1hmR%2BdAyJ5wxEW25mwmmcvDicYnOe9xzNOkYx5445YQf7X8td%2Fgn%2Bjj98mn0%2BN7%2BeD%2F%2B%2BzbpnNjGd4wtGAC1y7hwmM08RB9S6ZizwLOwvGwb9tI2T4ytQGiA8CsWYqu0iQLBQOQIl6qj2LPupG5gd07Z4lskeiSUqmtGnZI92XuzSuSzgC9Uq%2FHzeGQ5c4K%2Ff9%2FMvnJj6z3Pb2NoELexODASg0QlwDJmLhZ8C%2BdxTJEgL%2Fl%2BIAWVnbRTp8JdoW2mwYoRT%2FiZK0%2BlABqo%2BdEZqPFXs8Ns7%2BjwSHvDyLWHjagH8V7mVlJRyMU5jBj%2FQ0ZK243eyEhGT69QQ0erQbX7T87V7qh70bl6aAhfEA3UMAhObBvzz17gB4jOVqA94tkPLiK0wFOelrVDBJ6tUKizNbj3PBl79fyCucCbjKioqU08hLkRSkZsnXpaY6hkTsbL9ttvn2Olw2cWhq%2BJOff6GdQ5dQaVztoaLNuhXmdGfRL4Ai7O%2F7AK4w9h1EpuwvAgSjFlNkcuDNoKcwLdwXz32DQ9cAzpJdngOAa9EOL9HYfdL0G8UxHipW6k96t7kdGpc8BskvlRgfkp2rpws3crUmR%2BTVyKPKmKJfNErCw5sogS24PtBZwaIi7RJJC%2F3KkDQqpovHAItZ7QlgVySHyBFt%2FivbHDOPkBl0WxtuAwF0qXnX6uxUyeqXTGsQ9tprGKjB3RB7TJNXxCvlCCBaMUrXwyT27DBW0Rb8wETPv63M%2Bu%2FzH6hclpjkomp9EfVoRFnPZmuLiVHy7EakIJDuOLlnkHf99nRDu4wO2LUI2cfcMTRpm0iR6L%2BIE5tyOKEaJ4KfYC5IMiIG54Ctvcd1PJsxoWKWJw7pKG09whloW90HYIJFCkaalWFWZBR3tj%2BIH7nbR%2F67V60PEJ7BvpPvzI5lxMmAf3gkioaAwYrbFE6XxCDs7E49jEmJxISdzu8plArxQStCIwUktiJ4zcpRKNyH5ECqo%2FlZq9iPQ69SFSbkeKiUCBAUpC3UYMxItbxqsAcEGVYaSgNP4pjAtujQIVZpEKs4QAiuaYTplPBGHy%2Bjxqu0PGMeXn6SaeA5GgqNAwDIanab0y51EMpFudsbQGnT6VNx7Ahi03FhwjgW8S%2B%2FAuMRnZKCQ6CbqSnKftSL2uZti0qzHKMuIDSP0VUHoj%2F2iurtk%2FGcaJDsqsKg3da6uWWCyczz7mihh%2FvP0AqYdzI9cE5HoAfF77H4x4tBUeSzFTi3p95MqRDDlT10mEGrgmgOs2HhEVLdmBFEpn3JVk3IPhTsZtGgUsOmUrvoZZWdDULU2mQjOUmJXHaE%2FbjDcEP8kEfEuiXQpHdTajmGjrLOrMLOp8tZckz6Vqr8wi9M9Mo9LwI%2BtRdJTbuAEpKbZUZkDKo9wzUdqbPmmw6o1m9xWH9uflNYM12AOWjz3rGX8PYHxuJDRqO0%2FSM%2FZXMKJYc1MzN2V5d73g9As6%2F8XKv%2FHMOFr%2FbfaZh5IJHD6TM8P8hSyKM1MnpLWUgLunLowZ%2FW5VZAxLE1LfLZSAZ64uAV8mshyczM3V1ICLkaWkBEsbslMFfsjKNCcXdvh7nkW9mkJw8UGjAgR6CePS5qHpSnD8ROHJSxgZG%2FEubziSgESnnY17nebLwcXF8uPrGRqoq3VPJ9eBqyOqbIl9nBRrvbkf6gzSxRCeTyx%2BNDxXD54F86%2Fy7b9wZ8ysbcrcC4PP11zVzJV5ogOsLO5JUsGUqwPpks6uayn3duMnV5sr98bh707eFLmrSfQSsQw1Y%2FNxE1KTCYzudx8kaWfP0nbmDQHRGYBdS4W4c8IbYzq9urTam64Qd84MgzMhcNYJ6QC4cQPSfIW4uNr7ugqxBqveCPj8VL1msMoW%2FuIKcZhLRYs%2BOlNqlJPmK8LFQuQEUWBEPmGt06TLkHFeEdIsOqXqapClTJSXICMPdA%2B%2FaXq0LymKWmlj8mpkzvmSomspSupa07Fk6PJKP7XCeIFcqDzOOLfUlAYcqZ%2FRAWvTtqMkEaq5EFD2xvJrEiFN1fVQ1XjBsnR9TlJlYzEJeBgfyjcI7zxLvlMojZMmpE5Cmq9A7l3MA0SmHL8QFviakUYZqbCaCLvpV7BG38KXfpGt%2BfAT%3C%2Fdiagram%3E%3C%2Fmxfile%3E)
