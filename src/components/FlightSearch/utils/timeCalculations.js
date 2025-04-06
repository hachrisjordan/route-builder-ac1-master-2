import dayjs from 'dayjs';

export const calculateTimeWindow = (prevSegment, from, to, baseDate) => {
  if (!prevSegment || !prevSegment.flights.length) {
    return {
      start: dayjs(baseDate).startOf('day'),
      end: dayjs(baseDate).endOf('day')
    };
  }

  // For connecting flights, look at all arrivals from previous segment
  const arrivals = prevSegment.flights.map(f => dayjs(f.ArrivesAt));
  
  // Sort arrivals to find earliest and latest
  arrivals.sort((a, b) => a.valueOf() - b.valueOf());
  const earliestArrival = arrivals[0];
  const latestArrival = arrivals[arrivals.length - 1];

  console.log('\nTime Window Calculation:');
  console.log(`Earliest arrival: ${earliestArrival.format('YYYY-MM-DD HH:mm')}`);
  console.log(`Latest arrival: ${latestArrival.format('YYYY-MM-DD HH:mm')}`);
  console.log(`Window end: ${latestArrival.add(24, 'hours').format('YYYY-MM-DD HH:mm')}`);

  return {
    start: earliestArrival,
    end: latestArrival.add(24, 'hours')
  };
};