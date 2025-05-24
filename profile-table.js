const data = [
  ['empty-1.cpuprofile', '1 µs', '58.5 ms', '472', '10,514', '0.0 ms', '162.0 KB'],
  ['empty-10.cpuprofile', '10 µs', '17.5 ms', '338', '931', '0.0 ms', '73.3 KB'],
  ['empty-100.cpuprofile', '100 µs', '15.0 ms', '153', '100', '0.1 ms', '28.9 KB'],
  ['empty-1000.cpuprofile', '1000 µs (1 ms)', '13.9 ms', '49', '10', '1.3 ms', '8.6 KB'],
  ['empty-10000.cpuprofile', '10000 µs (10 ms)', '14.0 ms', '3', '2', '6.9 ms', '0.5 KB']
];

console.log('Profile File | Interval | Duration | Nodes | Samples | Avg | Size');
console.log('-------------|----------|----------|-------|---------|-----|-----');
data.forEach(row => console.log(row.join(' | '))); 