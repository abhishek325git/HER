import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const options = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: '#94a3b8' } // muted-foreground
    },
    title: {
      display: true,
      text: 'Activity Stats',
      color: '#e2e8f0'
    },
  },
  scales: {
    y: {
      ticks: { color: '#94a3b8' },
      grid: { color: '#1e293b' }
    },
    x: {
      ticks: { color: '#94a3b8' },
      grid: { color: '#1e293b' }
    }
  }
};

export function UsageLineChart({ data }: { data: any }) {
  return <Line options={options} data={data} />;
}

export function CategoryDoughnut({ data }: { data: any }) {
  return <Doughnut options={{...options, scales: {}}} data={data} />;
}
