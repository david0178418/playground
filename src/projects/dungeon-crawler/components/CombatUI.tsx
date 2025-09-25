import { Paper, Typography, Box, Button, Grid, LinearProgress, Chip, Stack } from '@mui/material';
import type { CombatState } from '../models/Combat';
import { ParticipantType, CombatActionType } from '../models/Combat';

interface CombatUIProps {
	combatState: CombatState;
	onCombatAction: (action: CombatActionType, targetId?: string) => void;
	disabled?: boolean;
}

export function CombatUI({ combatState, onCombatAction, disabled = false }: CombatUIProps) {
	const player = combatState.participants.find(p => p.type === ParticipantType.PLAYER);
	const enemies = combatState.participants.filter(p => p.type === ParticipantType.ENEMY && p.isActive);
	const currentParticipant = combatState.participants.find(p =>
		p.id === combatState.turnOrder[combatState.currentTurnIndex]
	);

	const isPlayerTurn = currentParticipant?.type === ParticipantType.PLAYER;

	const getHpPercentage = (current: number, max: number) => {
		return Math.max(0, (current / max) * 100);
	};

	const getHpColor = (percentage: number) => {
		if (percentage > 50) return 'success.main';
		if (percentage > 25) return 'warning.main';
		return 'error.main';
	};

	return (
		<Paper sx={{ p: 3, bgcolor: 'error.light', border: '2px solid', borderColor: 'error.main' }}>
			<Typography variant="h5" gutterBottom color="error.contrastText" sx={{ fontWeight: 'bold' }}>
				⚔️ Combat - Round {combatState.round}
			</Typography>

			{/* Turn indicator */}
			<Box sx={{ mb: 2 }}>
				<Chip
					label={isPlayerTurn ? "Your Turn!" : `${currentParticipant?.name}'s Turn`}
					color={isPlayerTurn ? "success" : "warning"}
					sx={{ fontWeight: 'bold' }}
				/>
			</Box>

			<Grid container spacing={3}>
				{/* Player Status */}
				<Grid size={{ xs: 12, md: 6 }}>
					<Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
						<Typography variant="h6" gutterBottom>
							{player?.name} (You)
						</Typography>
						{player?.character && (
							<>
								<Typography variant="body2" gutterBottom>
									HP: {player.character.hp.current} / {player.character.hp.max}
								</Typography>
								<LinearProgress
									variant="determinate"
									value={getHpPercentage(player.character.hp.current, player.character.hp.max)}
									sx={{
										height: 8,
										mb: 1,
										'& .MuiLinearProgress-bar': {
											backgroundColor: getHpColor(
												getHpPercentage(player.character.hp.current, player.character.hp.max)
											)
										}
									}}
								/>

								{/* Status Effects */}
								{player.statusEffects.length > 0 && (
									<Box sx={{ mt: 1 }}>
										<Typography variant="body2" color="text.secondary">
											Status Effects:
										</Typography>
										<Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
											{player.statusEffects.map((effect) => (
												<Chip
													key={effect.id}
													label={`${effect.name} (${effect.duration})`}
													size="small"
													color="info"
												/>
											))}
										</Stack>
									</Box>
								)}
							</>
						)}
					</Paper>
				</Grid>

				{/* Enemies Status */}
				<Grid size={{ xs: 12, md: 6 }}>
					<Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
						<Typography variant="h6" gutterBottom>
							Enemies
						</Typography>
						{enemies.map((enemy) => (
							<Box key={enemy.id} sx={{ mb: 2, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
								<Typography variant="body1" gutterBottom>
									{enemy.name}
								</Typography>
								{enemy.enemy && (
									<>
										<Typography variant="body2" gutterBottom>
											HP: {enemy.enemy.hp.current} / {enemy.enemy.hp.max}
										</Typography>
										<LinearProgress
											variant="determinate"
											value={getHpPercentage(enemy.enemy.hp.current, enemy.enemy.hp.max)}
											sx={{
												height: 6,
												'& .MuiLinearProgress-bar': {
													backgroundColor: getHpColor(
														getHpPercentage(enemy.enemy.hp.current, enemy.enemy.hp.max)
													)
												}
											}}
										/>

										{/* Status Effects */}
										{enemy.statusEffects.length > 0 && (
											<Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
												{enemy.statusEffects.map((effect) => (
													<Chip
														key={effect.id}
														label={`${effect.name} (${effect.duration})`}
														size="small"
														color="warning"
													/>
												))}
											</Stack>
										)}
									</>
								)}
							</Box>
						))}
					</Paper>
				</Grid>

				{/* Combat Actions */}
				{isPlayerTurn && (
					<Grid size={12}>
						<Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
							<Typography variant="h6" gutterBottom>
								Choose Your Action
							</Typography>
							<Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
								{/* Attack buttons for each enemy */}
								{enemies.map((enemy) => (
									<Button
										key={`attack-${enemy.id}`}
										variant="contained"
										color="error"
										onClick={() => onCombatAction(CombatActionType.ATTACK, enemy.id)}
										disabled={disabled}
										sx={{ mb: 1 }}
									>
										Attack {enemy.name}
									</Button>
								))}

								{/* Other combat actions */}
								<Button
									variant="outlined"
									color="primary"
									onClick={() => onCombatAction(CombatActionType.DEFEND)}
									disabled={disabled}
									sx={{ mb: 1 }}
								>
									Defend (+2 AC)
								</Button>

								<Button
									variant="outlined"
									color="warning"
									onClick={() => onCombatAction(CombatActionType.FLEE)}
									disabled={disabled}
									sx={{ mb: 1 }}
								>
									Flee
								</Button>

								{/* Item usage - placeholder for future implementation */}
								{player?.character?.inventory.some(item => item.baseType === 'potion') && (
									<Button
										variant="outlined"
										color="success"
										disabled={true} // Will enable when item usage is implemented
										sx={{ mb: 1 }}
									>
										Use Item (Coming Soon)
									</Button>
								)}
							</Stack>
						</Paper>
					</Grid>
				)}

				{/* Combat Log Preview */}
				{combatState.playerActions.length > 0 && (
					<Grid size={12}>
						<Paper sx={{ p: 2, bgcolor: 'background.default' }}>
							<Typography variant="h6" gutterBottom>
								Recent Actions
							</Typography>
							<Box sx={{ maxHeight: 150, overflow: 'auto' }}>
								{combatState.playerActions.slice(-5).map((action, index) => (
									<Typography
										key={index}
										variant="body2"
										sx={{
											fontFamily: 'monospace',
											mb: 0.5,
											color: action.type === CombatActionType.ATTACK ? 'error.main' : 'text.primary'
										}}
									>
										{action.description}
									</Typography>
								))}
							</Box>
						</Paper>
					</Grid>
				)}
			</Grid>
		</Paper>
	);
}