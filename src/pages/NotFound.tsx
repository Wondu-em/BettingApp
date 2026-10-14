import { Link } from 'react-router-dom'
import { Card } from '../components/Card'

export function NotFound() {
  return (
    <Card>
      <h1 className="text-2xl font-bold text-ink">Page not found</h1>
      <p className="mt-1 text-muted">
        <Link to="/" className="font-semibold text-brand underline-offset-2 hover:underline">
          Go to your home page
        </Link>
      </p>
    </Card>
  )
}
