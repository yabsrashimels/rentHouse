import { useParams } from 'react-router-dom'
import RoutePlaceholder from '../components/RoutePlaceholder'
export default function CityPage() {
  const { city } = useParams()
  return <RoutePlaceholder title={`Homes in ${city ?? 'your city'}`} />
}