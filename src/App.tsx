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
			</List>
		</Container>
	);
}
