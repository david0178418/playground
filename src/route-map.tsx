import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router";
import "./index.css";
import App from "./App";
import Foo from "./projects/foo/foo";
import { Fab } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function RouteMap() {
	return (
		<BrowserRouter>
			<Routes>
				<Route
					index
					element={<App />}
				/>
				<Route element={<ProjectLayout />}>
					<Route
						path="foo"
						element={<Foo />}
					/>
				</Route>
			</Routes>
		</BrowserRouter>
	);
}

function ProjectLayout() {
	return (
		<>
			<Fab
				component={Link}
				to="/"
				sx={{
					position: 'fixed',
					top: 16,
					left: 16,
				}}
			>
				<ArrowBackIcon />
			</Fab>
			<Outlet />
		</>
	)
}
