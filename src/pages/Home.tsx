import { Link } from 'react-router-dom'

export function Home() {
  return (
    <>
      <section className="hero home-hero stack">
        <h1>Pick recipes. Get one grocery list. Prep once.</h1>
        <p className="muted">
          Choose how many meals you want to prep, and Meal Prep scales the recipes, combines your grocery list,
          subtracts what's already in your fridge and pantry, and tells you exactly what goes in each container.
        </p>
        <div className="row">
          <Link className="btn btn-primary" to="/plan/setup/meals">Plan meals</Link>
          <Link className="btn" to="/recommended">Browse recommended recipes</Link>
        </div>
      </section>
    </>
  )
}
