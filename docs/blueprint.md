# **App Name**: RouteWise

## Core Features:

- Booking Information Input: Collect user's name, email, phone number, pickup location, destination, intended date of departure, vehicle type, and luggage count through a clear and intuitive form.
- Departure Date Selection: Display available departure dates clearly, allowing users to select their preferred option, with an intended date of departure, and an alternative date of departure.
- Vehicle Selection: Present available vehicle options (4-seater Sienna, 5-seater Sienna, 7-seater Bus) with associated costs.
- Fare Calculation and Display: Dynamically calculate and display the total booking cost based on the selected vehicle type, luggage count, and distance. Utilize a simple calculation method initially.
- Store the booking: Store the booking request to local storage, so the customer can see what they have requested and their previous trip requests. Make use of firebase services in this application
- Booking Confirmation: Provide a confirmation page displaying all booking details, including user information, selected dates, vehicle type, and total cost.
- Firebase integration: Make use of firebase to set price and confirm or reject booking
- Admin Component: Admin component, that would undergo authentication through firebase authentication, and also have access to customer bookings (confirming or cancelling them), sett prices for trips using pickup location, destination, and vehicle type. To confirm booking, admin should also be required to select one of the two dates (intended and alternative).

## Style Guidelines:

- A vibrant blue (#FFDF00) to evoke feelings of trust and reliability, inspired by the themes of travel and efficiency.
- A light, desaturated blue (#F0F5FB) to provide a clean and calm backdrop, enhancing readability.
- An energetic orange (#FFA500) for calls to action and important highlights, contrasting effectively with the blue tones.
- PT Sans', a humanist sans-serif font with a balance of modernity and warmth suitable for all text.
- Use simple, clear icons to represent different vehicle types and booking options.
- Maintain a clean and straightforward layout to facilitate ease of use.
- Incorporate smooth transitions to improve user engagement