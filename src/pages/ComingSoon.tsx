import { Card } from '../components/Card'
import { PageHeader } from '../components/PageHeader'

/** Placeholder for screens that are built in later steps. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <p className="text-muted">This screen is built in a later step.</p>
      </Card>
    </>
  )
}
