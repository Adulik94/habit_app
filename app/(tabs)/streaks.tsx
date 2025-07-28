import {
  client,
  COMPLETIONS_COLLECTION_ID,
  DATABASE_ID,
  databases,
  HABITS_COLLECTION_ID,
  RealTimeResponse,
} from "@/lib/appwrite";
import { useAuth } from "@/lib/auth-context";
import {
  Habit,
  HabitsCompletion,
} from "@/types/database.type";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Query } from "react-native-appwrite";
import { Card, Text } from "react-native-paper";

export default function StreaksScreen() {
  const [habits, setHabits] = useState<Habit[]>(
    []
  );
  const [completedHabits, setCompletedHabits] =
    useState<HabitsCompletion[]>([]);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const habitsChannel = `databases.${DATABASE_ID}.collections.${HABITS_COLLECTION_ID}.documents`;
      const habitSubscription = client.subscribe(
        habitsChannel,
        (response: RealTimeResponse) => {
          if (
            response.events.includes(
              "databases.*.collections.*.documents.*.create"
            )
          ) {
            fetchHabits();
          } else if (
            response.events.includes(
              "databases.*.collections.*.documents.*.update"
            )
          ) {
            fetchHabits();
          } else if (
            response.events.includes(
              "databases.*.collections.*.documents.*.delete"
            )
          ) {
            fetchHabits();
          }
        }
      );

      const completionChannel = `databases.${DATABASE_ID}.collections.${COMPLETIONS_COLLECTION_ID}.documents`;
      const completionSubscription =
        client.subscribe(
          completionChannel,
          (response: RealTimeResponse) => {
            if (
              response.events.includes(
                "databases.*.collections.*.documents.*.create"
              )
            ) {
              fetchCompletions();
            }
          }
        );
      fetchHabits();
      fetchCompletions();

      return () => {
        habitSubscription();
        completionSubscription();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchHabits = async () => {
    try {
      const response =
        await databases.listDocuments(
          DATABASE_ID,
          HABITS_COLLECTION_ID,
          [
            Query.equal(
              "user_id",
              user?.$id ?? ""
            ),
          ]
        );
      setHabits(response.documents as Habit[]);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCompletions = async () => {
    try {
      const response =
        await databases.listDocuments(
          DATABASE_ID,
          COMPLETIONS_COLLECTION_ID,
          [
            Query.equal(
              "user_id",
              user?.$id ?? ""
            ),
          ]
        );
      const completions =
        response.documents as HabitsCompletion[];

      setCompletedHabits(completions);
    } catch (error) {
      console.error(error);
    }
  };

  interface StreakData {
    streak: number;
    bestStreak: number;
    total: number;
  }

  const getStreakData = (
    habitID: string
  ): StreakData => {
    const habitCompletion = completedHabits
      ?.filter((c) => c.habit_id === habitID)
      .sort(
        (a, b) =>
          new Date(a.completed_at).getTime() -
          new Date(b.completed_at).getTime()
      );

    if (habitCompletion?.length === 0) {
      return {
        streak: 0,
        bestStreak: 0,
        total: 0,
      };
    }

    // build streaks
    let streak = 0;
    let bestStreak = 0;
    let total = habitCompletion.length;

    let lastDate: Date | null = null;
    let currentStreak = 0;

    habitCompletion?.forEach((c) => {
      const date = new Date(c.completed_at);

      if (lastDate) {
        const diff =
          (date.getTime() - lastDate.getTime()) /
          (1000 * 60 * 60 * 24);

        if (diff <= 1.5) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
      }
      streak = currentStreak;
      lastDate = date;
    });

    return {
      streak,
      bestStreak,
      total,
    };
  };

  const habitStreaks = habits.map((habit) => {
    const { streak, bestStreak, total } =
      getStreakData(habit.$id);
    return { habit, bestStreak, streak, total };
  });

  const rankedHabit = habitStreaks.sort(
    (a, b) => b.bestStreak - a.bestStreak
  );

  const badgeStyles = [
    styles.badge1,
    styles.badge2,
    styles.badge3,
  ];

  return (
    <View style={styles.container}>
      <Text
        style={styles.title}
        variant="headlineSmall"
      >
        Habit Streaks
      </Text>

      {rankedHabit.length > 0 && (
        <View style={styles.rankingContainer}>
          <Text style={styles.rankingTitle}>
            🎖️ Top Streaks
          </Text>
          {rankedHabit
            .slice(0, 3)
            .map((item, key) => (
              <View
                key={key}
                style={styles.rankingRow}
              >
                <View
                  style={[
                    styles.rankingBadge,
                    badgeStyles[key],
                  ]}
                >
                  <Text
                    style={
                      styles.rankingBadgeText
                    }
                  >
                    {key + 1}
                  </Text>
                </View>
                <Text style={styles.rankingHabit}>
                  {item.habit.title}
                </Text>
                <Text
                  style={styles.rankingStreak}
                >
                  {item.bestStreak}
                </Text>
              </View>
            ))}
        </View>
      )}
      {habits.length === 0 ? (
        <View>
          <Text>
            No Habits yet.Add your first habit
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.container}
        >
          {rankedHabit.map(
            (
              {
                habit,
                bestStreak,
                streak,
                total,
              },
              key
            ) => (
              <Card
                key={key}
                style={[
                  styles.card,
                  key === 0 && styles.firstCard,
                ]}
              >
                <Card.Content>
                  <Text
                    style={styles.habitTitle}
                    variant="titleMedium"
                  >
                    {habit.title}
                  </Text>
                  <Text
                    style={
                      styles.habitDescription
                    }
                  >
                    {habit.description}
                  </Text>
                  <View style={styles.statsRow}>
                    <View
                      style={styles.statsBadge}
                    >
                      <Text
                        style={
                          styles.statsBadgeText
                        }
                      >
                        🔥{streak}
                      </Text>
                      <Text
                        style={styles.statsLabel}
                      >
                        Current
                      </Text>
                    </View>
                    <View
                      style={
                        styles.statsBadgeGold
                      }
                    >
                      <Text
                        style={
                          styles.statsBadgeText
                        }
                      >
                        🏆{bestStreak}
                      </Text>
                      <Text
                        style={styles.statsLabel}
                      >
                        Best
                      </Text>
                    </View>
                    <View
                      style={
                        styles.statsBadgeGreen
                      }
                    >
                      <Text
                        style={
                          styles.statsBadgeText
                        }
                      >
                        ✅{total}
                      </Text>
                      <Text
                        style={styles.statsLabel}
                      >
                        Total
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontWeight: "bold",
    marginBottom: 16,
  },
  card: {
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: "#fff",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  firstCard: {
    borderColor: "#7c4dff",
    borderWidth: 2,
  },
  habitTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
  },

  habitDescription: {
    marginBottom: 8,
    color: "#6c6c80",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 8,
  },
  statsBadge: {
    backgroundColor: "#fff3e0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statsBadgeGold: {
    backgroundColor: "#fffde7",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },
  statsBadgeGreen: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    minWidth: 60,
  },

  statsBadgeText: {
    fontWeight: "bold",
    fontSize: 15,
    color: "#22223b",
  },
  statsLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
  },
  rankingContainer: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    textShadowRadius: 8,
  },
  rankingTitle: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 12,
    color: "#7c4dff",
    letterSpacing: 0.5,
  },
  rankingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8,
  },
  rankingBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#e0e0e0",
  },
  badge1: {
    backgroundColor: "#ffd700",
  },
  badge2: {
    backgroundColor: "#c0c0c0",
  },
  badge3: {
    backgroundColor: "#cd7f32",
  },
  rankingBadgeText: {
    fontWeight: "bold",
    color: "#fff",
    fontSize: 15,
  },
  rankingHabit: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    fontWeight: "600",
  },
  rankingStreak: {
    fontSize: 14,
    color: "#7c4dff",
    fontWeight: "bold",
  },
});
