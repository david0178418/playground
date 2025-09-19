import { Container } from "@mui/material";
import { DungeonGenerator } from "./components/DungeonGenerator";

export default function DungeonGeneratorProject() {
	return (
		<Container maxWidth={false} sx={{ p: 0, height: '100vh' }}>
			<DungeonGenerator />
		</Container>
	);
}