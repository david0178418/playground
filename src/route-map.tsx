import { BrowserRouter, Link, Outlet, Route, Routes } from "react-router";
import "./index.css";
import App from "./App";
import Foo from "./projects/foo/foo";
import DungeonGenerator from "./projects/dungeon-generator";
import { Fab } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const basename = getBasename();

export default function RouteMap() {
	return (
		<BrowserRouter basename={basename}>
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
					<Route
						path="dungeon-generator"
						element={<DungeonGenerator />}
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


function getBasename() {
	try {
		// @ts-ignore
		return process.env.PUBLIC_URL;
	} catch (error) {
		return '/';
	}
}