import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import RecipeDetailPage from './pages/RecipeDetailPage'
import RecipeFormPage from './pages/RecipeFormPage'
import MealPlannerPage from './pages/MealPlannerPage'
import ShoppingListPage from './pages/ShoppingListPage'
import FridgeMatcherPage from './pages/FridgeMatcherPage'
import TrashPage from './pages/TrashPage'
export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/recipes" element={<HomePage />} />
          <Route path="/recipes/new" element={<RecipeFormPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeFormPage />} />
          {/* <Route path="/meal-planner" element={<MealPlannerPage />} /> */}
          {/* <Route path="/shopping-list" element={<ShoppingListPage />} /> */}
          <Route path="/fridge" element={<FridgeMatcherPage />} />
          <Route path="/trash" element={<TrashPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
