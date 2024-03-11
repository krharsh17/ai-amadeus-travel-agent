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

let flightOptions = []

let user = {
    name: {
        firstName: "John",
        lastName: "Doe"
    },
    dateOfBirth: "1982-01-16",
    gender: "MALE",
    contact: {
        emailAddress: "john@doe.com",
        phones: [
            {
                deviceType: "MOBILE",
                countryCallingCode: "34",
                number: "480080076"
            }
        ]
    },
    documents: [
        {
            documentType: "PASSPORT",
            birthPlace: "Madrid",
            issuanceLocation: "Madrid",
            issuanceDate: "2015-04-14",
            number: "00000000",
            expiryDate: "2025-04-14",
            issuanceCountry: "ES",
            validityCountry: "ES",
            nationality: "ES",
            holder: "true"
        }
    ]
}

const paymentDetails = {
    method: "creditCard",
    card: {
      vendorCode: "VI",
      cardNumber: "4111111111111111",
      expiryDate: "2026-01"
    }
}

const getFlights = async (iataCode) => {

    try {
        const response = await amadeus.shopping.flightDestinations.get({ origin: iataCode })
        flightOptions = response.data
        return response.data
    } catch (error) {
        if (error.response) {
            console.error(error.response);
            return "Error";
        }
    }
}

const bookFlight = async (option) => {
    try {

        const offersResponse = await amadeus.shopping.flightOffersSearch.get({
            originLocationCode: flightOptions[option].origin,
            destinationLocationCode: flightOptions[option].destination,
            departureDate: flightOptions[option].departureDate,
            returnDate: flightOptions[option].returnDate,
            adults: "1",
            max: 1
        });

        const confirmationResponse = await amadeus.shopping.flightOffers.pricing.post(
            JSON.stringify({
                'data': {
                    'type': 'flight-offers-pricing',
                    'flightOffers': [offersResponse.data[0]],
                }
            })
        )

        const response = await amadeus.booking.flightOrders.post(JSON.stringify({
            'data': {
                'type': 'flight-order',
                'flightOffers': [confirmationResponse.data.flightOffers[0]],
                'travelers': [{
                    "id": "1",
                    ...user
                },]
            }
        }))

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

const listHotels = async (location) => {
    const response = await amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: location
    });

    return response.data

}

const findHotelOffers = async (hotelId, checkInDate, checkoutDate) => {
    const response = await amadeus.shopping.hotelOffersSearch.get({
        hotelIds: hotelId,
        adults: '1',
        checkInDate,
        checkoutDate
    })

    return response.data
}

const bookHotel = async (location, departureDate, returnDate) => {
    const hotels = await listHotels(location)

    let offers = []

    for (let i=0; i<hotels.length; i++) {
        const item = hotels[i]
        try {
            // Optionally add a wait function here to avoid overloading the Amadeus API: 
            // const delay = ms => new Promise(res => setTimeout(res, ms)); await delay(2000);

            offers = await findHotelOffers(item.hotelId, departureDate, returnDate)

        } catch (e) {
            console.log(e)
        }

        if (offers.length !== 0)
            break
    }

    if (offers.length === 0) {
        return "Sorry!, we could not find any hotel rooms available for your stay dates"
    }

    const offer = offers[0].offers[0]

    const response = await amadeus.booking.hotelBookings.post(JSON.stringify({
        data: {
          offerId: offer.id,
          guests: [
            {
              name: {
                title: "MR",
                firstName: user.name.firstName,
                lastName: user.name.lastName
              },
              contact: {
                phone: "+" + user.contact.phones[0].countryCallingCode + user.contact.phones[0].number,
                email: user.contact.emailAddress
              }
            }
          ],
          payments: [paymentDetails]
        }
      }));

      return offer.room.type + " type room in " + offers[0].hotel.name + " for " + offer.guests.adults + " people. Booking confirmation ID is: " + response.data[0].providerConfirmationId
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
        },
        {
            "type": "function",
            "function": {
                "name": "bookHotel",
                "description": "Book a hotel in the destination location of the user for the journey departure and return dates",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "The IATA code of the destination location",
                        },
                        "departureDate": {
                            "type": "string",
                            "description": "The departure date of the user's flight in the format YYYY-MM-DD",
                        },
                        "returnDate": {
                            "type": "string",
                            "description": "The return date of the user's flight in the format YYYY-MM-DD",
                        },
                    },
                    "required": ["location", "departureDate"],
                },
            }
        },
        {
            "type": "function",
            "function": {
                "name": "bookFlight",
                "description": "Book a flight based on the option chosen by the user",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "option": {
                            "type": "number",
                            "description": "The number of the option chosen by the user",
                        },
                    },
                    "required": ["option"],
                },
            }
        },

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

            switch (response.data.choices[0].message.tool_calls[0].function.name) {
                case "getFlights": {
                    const iataString = JSON.parse(response.data.choices[0].message.tool_calls[0].function.arguments).iataString;
                    const flightList = await getFlights(iataString)
                    const summarizedFlights = await getSummarizedFlightList(flightList, messages);
                    res.json({ message: summarizedFlights });
                    break;
                }
                case "bookFlight": {
                    const args = JSON.parse(response.data.choices[0].message.tool_calls[0].function.arguments)
                    await bookFlight(args.option - 1)
                    res.json({ message: { role: "assistant", content: "Your flight has been booked successfully. Would you like to book a hotel in " + flightOptions[args.option - 1].destination + " for your stay?" } })
                    break;
                }
                case "bookHotel": {
                    const args = JSON.parse(response.data.choices[0].message.tool_calls[0].function.arguments)
                    const hotelDetails = await bookHotel(args.location, args.departureDate, args.returnDate)
                    res.json({ message: { role: "assistant", content: "Your hotel has been been successfully booked. Here are the details: " + hotelDetails + ". Please let me know if you need anything else!" } })
                    break;
                }
            }

        } else {
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
