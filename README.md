# Building an AI-Powered Travel Agent with the Amadeus Travel APIs


The main branch of this repository contains the code developed in the part 1 of this series. It has a chat bot configured to ask the user their from and to locations and a travel date. In the part 2 of this series, you will build the functionality to book a flight based on the choice made by the user and suggest (and book) a recommended hotel in the destination location for the user.

To run this project:
1. Clone it locally
2. Rename .env.example to .env
3. Create an [OpenAI](https://platform.openai.com/login?launch) account if you don't have one.
4. Go to the [API keys section](https://platform.openai.com/api-keys) on the OpenAI dashboard and generate a new key for your project.
5. Create a new [Amadeus for Developers](https://www.accounts.amadeus.com/LoginService/authorize?service=PAA&redirect_uri=https%3A%2F%2Fdevelopers.amadeus.com%2Fmy-apps%3Fauth&scope=openid&response_mode=fragment) account if you don't already have one.
6. Go to the [My Apps](https://developers.amadeus.com/my-apps) section on the Amadeus for Developers dashboard and create a new app. Once the app is created, copy your API key and secret. 
7. In the .env file, populate the value of the API key from OpenAI and the API key and secret from Amadeus.
8. Run `npm i` to install the project's dependencies.
9. Run `npm run dev` to start the development server.

You can now run the app and develop it while following the part 2 of the series. To take a look at the finished code, switch to the `finished` branch. Happy coding!