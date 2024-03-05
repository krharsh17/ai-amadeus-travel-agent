import { useState, useMemo } from 'react';

import './App.css'

function App() {

  const [messages, setMessages] = useState([{ role: "system", content: "The following is a conversation with an AI travel assistant. The assistant is helpful and knowledgeable. The assistant starts the conversation by asking about the user's departure city. If the user replies with a city that has multiple airports, the assistant should list the airports in that city and ask for clarification as to which airport they want to depart from. Do not ask for this clarification in the case of metropolitan areas that have a single IATA code representing them, such as NYC. In those cases, use the IATA code for the metropolitan area. Once you know the airport or metropolitan area the user will depart from, call the function getFlights with the IATA code for that airport or metropolitan area. After the user selects a flight from the given options, ask the user for their travel date and an optional return date. If the option already contains dates, do not ask the user again for the dates. Once you have the travel date, call the bookFlight function to book the chosen flight on the chosen date." }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useMemo(() => {
    const sendInitialMessage = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (response.ok) {
          const data = await response.json();
          const dataMsg = data.message;
          setMessages(prevMessages => [...prevMessages, dataMsg]);
        } else {
          console.error('Failed to send initial context to the server');
        }

        setIsLoading(false)
      } catch (error) {

        console.error('Error:', error);
        setIsLoading(false)
      }
    };

    sendInitialMessage();

  }, []);



  const sendMessage = async () => {
    if (input.trim()) {
      const newMessage = { role: 'user', content: input };
      setInput('');

      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);

      try {
        setIsLoading(true)
        const response = await fetch('/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedMessages),
        });


        if (response.ok) {
          const data = await response.json();
          const dataMsg = data.message;
          setMessages(responseMsg => [...responseMsg, dataMsg]);
        } else {
          console.error('Failed to send message to the server');
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false)
      }
    }
  }


  return (
    <div className="App">
      <div className="chat-container">
        {messages
          .filter(message => message.role === 'assistant' || message.role === 'user')
          .map((message, index) => (
            <div key={index} className={`chat-bubble ${message.role === 'assistant' ? 'assistant' : 'user'}`}>
              {message.content}
            </div>
          ))}
        {isLoading && (
          <div className="chat-bubble assistant typing-indicator">
            <span>.</span><span>.</span><span>.</span>
          </div>
        )}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )

}

export default App;
