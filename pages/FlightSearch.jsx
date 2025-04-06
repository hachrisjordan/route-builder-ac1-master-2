import React, { useState } from 'react';
import Select from 'react-select';
import { airports } from '../../data/airports';
import airlines from '../../data/airlines';

function FlightSearch() {
  const [departure, setDeparture] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [maxSegments, setMaxSegments] = useState(3);

  // Convert airports data to react-select format
  const airportOptions = airports.map(airport => ({
    value: airport.IATA,
    label: `${airport.Name} (${airport.IATA})`
  }));

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Flight Search</h1>
      
      <div className="space-y-4">
        {/* Departure Airport */}
        <div>
          <label className="block mb-2 font-medium">Departure Airport</label>
          <Select
            value={departure}
            onChange={setDeparture}
            options={airportOptions}
            placeholder="Select departure airport"
            isClearable
          />
        </div>

        {/* Arrival Airport */}
        <div>
          <label className="block mb-2 font-medium">Arrival Airport</label>
          <Select
            value={arrival}
            onChange={setArrival}
            options={airportOptions}
            placeholder="Select arrival airport"
            isClearable
          />
        </div>

        {/* Airlines */}
        <div>
          <label className="block mb-2 font-medium">Airlines</label>
          <Select
            isMulti
            value={selectedAirlines}
            onChange={setSelectedAirlines}
            options={airlines}
            placeholder="Select airlines"
          />
        </div>

        {/* Max Segments */}
        <div>
          <label className="block mb-2 font-medium">Maximum Segments</label>
          <input
            type="number"
            min={1}
            max={5}
            value={maxSegments}
            onChange={(e) => setMaxSegments(Number(e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
    </div>
  );
}

export default FlightSearch; 