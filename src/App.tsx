import { Container, List, ListItem, ListItemText } from "@mui/material";
import "./index.css";
import { Link } from "react-router";

export default function App() {
	return (
		<Container>
			<List>
				<ListItem component={Link} to="/foo">
					<ListItemText>
						Link to Foo
					</ListItemText>
				</ListItem>
				<ListItem component={Link} to="/dungeon-generator">
					<ListItemText>
						Dungeon Generator
					</ListItemText>
				</ListItem>
				<ListItem component={Link} to="/dungeon-crawler">
					<ListItemText>
						Dungeon Crawler Game
					</ListItemText>
				</ListItem>
			</List>
		</Container>
	);
}
