import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Demo data - will be replaced with real FIDE data from Supabase
const mockRatingData = [
  { month: "Feb", rating: 1320 },
  { month: "Mar", rating: 1345 },
  { month: "Apr", rating: 1380 },
  { month: "May", rating: 1365 },
  { month: "Jun", rating: 1400 },
  { month: "Jul", rating: 1425 },
  { month: "Aug", rating: 1410 },
  { month: "Sep", rating: 1440 },
  { month: "Oct", rating: 1420 },
  { month: "Nov", rating: 1455 },
  { month: "Dec", rating: 1470 },
  { month: "Jan", rating: 1450 },
];

const FIDEChart = () => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={mockRatingData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="hsl(var(--border))" 
            vertical={false}
          />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={['dataMin - 50', 'dataMax + 50']}
            tickFormatter={(value) => value.toString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "var(--shadow-elevated)",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
            itemStyle={{ color: "hsl(var(--muted-foreground))" }}
            formatter={(value: number) => [`${value}`, "FIDE Rating"]}
          />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="hsl(var(--gold))"
            strokeWidth={3}
            dot={{ fill: "hsl(var(--gold))", strokeWidth: 0, r: 4 }}
            activeDot={{ fill: "hsl(var(--gold))", strokeWidth: 0, r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FIDEChart;
