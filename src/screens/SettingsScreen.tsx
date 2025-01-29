import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { List, Switch, Divider } from 'react-native-paper';

const SettingsScreen = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [emailUpdates, setEmailUpdates] = React.useState(true);

  return (
    <ScrollView style={styles.container}>
      <List.Section>
        <List.Subheader>App Settings</List.Subheader>
        <List.Item
          title="Push Notifications"
          description="Receive learning reminders and updates"
          left={props => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch value={notifications} onValueChange={setNotifications} />
          )}
        />
        <Divider />
        <List.Item
          title="Dark Mode"
          description="Toggle dark theme"
          left={props => <List.Icon {...props} icon="theme-light-dark" />}
          right={() => (
            <Switch value={darkMode} onValueChange={setDarkMode} />
          )}
        />
        <Divider />
        <List.Item
          title="Email Updates"
          description="Receive progress reports and tips"
          left={props => <List.Icon {...props} icon="email" />}
          right={() => (
            <Switch value={emailUpdates} onValueChange={setEmailUpdates} />
          )}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>Account</List.Subheader>
        <List.Item
          title="Profile"
          description="Manage your profile"
          left={props => <List.Icon {...props} icon="account" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Learning Progress"
          description="View your learning statistics"
          left={props => <List.Icon {...props} icon="chart-line" />}
          onPress={() => {}}
        />
        <Divider />
        <List.Item
          title="Sign Out"
          description="Log out of your account"
          left={props => <List.Icon {...props} icon="logout" />}
          onPress={() => {}}
        />
      </List.Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default SettingsScreen;