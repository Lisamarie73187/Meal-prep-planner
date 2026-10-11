import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { RequireAdmin, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { AdjustPage } from './pages/AdjustPage'
import { AuthPage } from './pages/Auth'
import { HiddenRecipes } from './pages/HiddenRecipes'
import { Home } from './pages/Home'
import { Inventory } from './pages/Inventory'
import { AdminRecipes } from './pages/MyRecipes'
import { PlanGoals } from './pages/PlanGoals'
import { PlanPick } from './pages/PlanPick'
import { PlanResults } from './pages/PlanResults'
import { PlanReview } from './pages/PlanReview'
import { SetupAvoid } from './pages/setup/SetupAvoid'
import { SetupDiet } from './pages/setup/SetupDiet'
import { SetupIngredients } from './pages/setup/SetupIngredients'
import { SetupIndex, SetupLayout } from './pages/setup/SetupLayout'
import { SetupMeals } from './pages/setup/SetupMeals'
import { Plans } from './pages/Plans'
import { AdminIngredients } from './pages/AdminIngredients'
import { Recipes } from './pages/Recipes'
import { RecipeDetail } from './pages/RecipeDetail'
import { RecipeEdit } from './pages/RecipeEdit'
import { Targets } from './pages/Targets'

function ChooseRedirect() {
  const { id } = useParams()
  return <Navigate to={`/plan/${id}/pick`} replace />
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recommended" element={<Navigate to="/recipes" replace />} />
            <Route path="hidden" element={<HiddenRecipes />} />
            <Route path="recipes/:id" element={<RecipeDetail />} />
            <Route path="sign-in" element={<AuthPage mode="sign-in" />} />
            <Route path="sign-up" element={<AuthPage mode="sign-up" />} />
            {/* Planning works signed out (the plan id is "local"); saving it needs an account. */}
            {/* Set up is a four-screen wizard. The old /plan/new address still works and lands on the first screen. */}
            <Route path="plan/new" element={<SetupIndex />} />
            <Route path="plan/setup" element={<SetupLayout />}>
              <Route index element={<SetupIndex />} />
              <Route path="meals" element={<SetupMeals />} />
              <Route path="ingredients" element={<SetupIngredients />} />
              <Route path="avoid" element={<SetupAvoid />} />
              <Route path="diet" element={<SetupDiet />} />
            </Route>
            <Route path="plan/:id/goals" element={<PlanGoals />} />
            <Route path="plan/:id/pick/:slot?" element={<PlanPick />} />
            {/* The old browse page is gone; old links land on the pick screens. */}
            <Route path="plan/:id/choose" element={<ChooseRedirect />} />
            <Route path="plan/:id/review" element={<PlanReview />} />
            <Route path="plan/:id/results" element={<PlanResults />} />

            <Route element={<RequireAuth />}>
              <Route path="inventory" element={<Inventory />} />
              <Route path="plans" element={<Plans />} />
              <Route path="my-recipes" element={<Navigate to="/recipes?tab=mine" replace />} />
              <Route path="my-recipes/new" element={<RecipeEdit mode="user" isNew />} />
              <Route path="my-recipes/:id/edit" element={<RecipeEdit mode="user" />} />
              <Route path="recipes/:id/adjust" element={<AdjustPage />} />
              <Route path="recipes/:id/edit" element={<RecipeEdit mode="user" copy />} />
              <Route path="targets" element={<Targets />} />
              <Route element={<RequireAdmin />}>
                <Route path="admin/recipes" element={<AdminRecipes />} />
                <Route path="admin/ingredients" element={<AdminIngredients />} />
                <Route path="admin/recipes/new" element={<RecipeEdit mode="admin" isNew />} />
                <Route path="admin/recipes/:id/edit" element={<RecipeEdit mode="admin" />} />
              </Route>
            </Route>

            <Route path="*" element={<p className="center-note">Page not found.</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
