const express = require('express');
const app = express();
const axios = require('axios');
const dotenv = require('dotenv');
const Amadeus = require('amadeus')

dotenv.config();

app.use(express.json());


const amadeus = new Amadeus({
    clientId: process.env.AMADEUS_API_KEY,
    clientSecret: process.env.AMADEUS_API_SECRET
})

const getFlights = async (iataCode) => {

    try {
        const response = await amadeus.shopping.flightDestinations.get({ origin: iataCode })
        return response.data
    } catch (error) {
        if (error.response) {
            console.error(error.response);
            return "Error";
        }
    }
}


const getSummarizedFlightList = async (formattedFlightData, messages) => {

    if (formattedFlightData === "Error") {
        return { "role": "assistant", "content": "There is a problem with your departure city. Can you choose a different one, please?" };
    }

    try {
        const newMsg = `I have found some flight options: ${JSON.stringify(formattedFlightData)}. I will now summarize these options in a friendly and conversational way.`;
        const fullMessages = [...messages, { "role": "assistant", "content": newMsg }];

        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo-1106",
            messages: fullMessages
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        })
        const data = response.data;
        return data.choices[0].message;

    } catch (error) {
        console.error("Error in sendMessageToOpenAI: ", error);
        throw error;
    }
}

app.post('/chat', async (req, res) => {
    const messages = req.body;

    const tools = [
        {
            "type": "function",
            "function": {
                "name": "getFlights",
                "description": "Get a list of flight recommendations based on the IATA code for a departing airport",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "iataString": {
                            "type": "string",
                            "description": "IATA code for an airport",
                        },
                    },
                    "required": ["iataString"],
                },
            }
        }
    ];


    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo-1106",
            messages: messages,
            tools: tools
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
        })

        if (response.data.choices[0].message.tool_calls) {

            const iataString = JSON.parse(response.data.choices[0].message.tool_calls[0].function.arguments).iataString;
            const flightList = await getFlights(iataString)
            const summarizedFlights = await getSummarizedFlightList(flightList, messages);
            res.json({ message: summarizedFlights });

        }
        else {
            res.json({ message: response.data.choices[0].message })
        }

    }
    catch (error) {
        console.error(error);
        res.status(500).send('Error communicating with the OpenAI API');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
