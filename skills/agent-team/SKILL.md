---
name: agent-team
description: Execute tasks using a coordinated agent team with role-based assignments, devil's advocate review, and persistent team knowledge
allowed-tools: TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Read, Write, Bash, AskUserQuestion
---

# Agent Team Execution

This skill creates and manages a coordinated team of specialized agents to execute complex tasks with built-in quality assurance and persistent learning.

## When to Activate

Activate this skill when:
- Complex tasks require multiple specialized perspectives
- User explicitly requests team-based or collaborative approach
- Task benefits from structured review and critique
- Need to leverage accumulated team knowledge from past executions

## Available Roles

### Core Execution Roles

**architect** (System Architect)
- Designs overall system architecture and technical approach
- Makes high-level technical decisions
- Ensures architectural consistency

**implementer** (Implementation Specialist)
- Writes and modifies code
- Implements features and fixes bugs
- Focuses on practical execution

**reviewer** (Code Reviewer)
- Reviews code quality and best practices
- Identifies potential issues and improvements
- Ensures code meets standards

**tester** (Test Specialist)
- Designs and executes tests
- Verifies functionality and edge cases
- Ensures quality and reliability

**security** (Security Specialist)
- Identifies security vulnerabilities
- Ensures secure coding practices
- Reviews authentication, authorization, and data protection

**documenter** (Documentation Specialist)
- Creates and maintains documentation
- Ensures clarity and completeness
- Documents architecture decisions

### Required Quality Assurance Role

**devils-advocate** (Devil's Advocate) - **ALWAYS REQUIRED**
- Challenges assumptions and decisions
- Identifies potential problems and risks
- Provides critical perspective to improve outcomes
- Questions "why" and "what if"

## Process

### 1. Load Team Knowledge

First, check for existing team knowledge from past executions:

```bash
KNOWLEDGE_DIR="skills/agent-team/team-knowledge"
KNOWLEDGE_FILE="${KNOWLEDGE_DIR}/accumulated-knowledge.md"

if [ -f "$KNOWLEDGE_FILE" ]; then
    echo "📚 Loading team knowledge from previous sessions..."
    cat "$KNOWLEDGE_FILE"
else
    echo "📝 No previous team knowledge found. Starting fresh."
fi
```

**Read the knowledge file if it exists** using the Read tool. This knowledge informs the current execution.

### 2. Analyze Task and Select Roles

Based on the user's task, determine which roles are needed:

- **Always include**: devils-advocate (required for all tasks)
- **For feature implementation**: architect, implementer, reviewer, tester, devils-advocate
- **For security-related tasks**: security, implementer, reviewer, devils-advocate
- **For refactoring**: architect, implementer, reviewer, devils-advocate
- **For documentation**: documenter, reviewer, devils-advocate
- **For bug fixes**: implementer, tester, reviewer, devils-advocate

Ask the user to confirm the selected roles using AskUserQuestion if the task is ambiguous.

### 3. Create Team

Use TeamCreate to establish the team:

```
{
  "team_name": "task-[brief-description]",
  "description": "[Brief description of the task and objectives]",
  "agent_type": "team-lead"
}
```

### 4. Create Task Breakdown

Create tasks using TaskCreate for each major work item:

```
{
  "subject": "[Imperative description]",
  "description": "[Detailed requirements and acceptance criteria]",
  "activeForm": "[Present continuous form for spinner]"
}
```

### 5. Spawn Teammates

For each selected role, spawn an agent using the Task tool:

```
{
  "subagent_type": "general-purpose",
  "description": "[Role name] for [task]",
  "prompt": "You are the [role name] for this task.

Your role: [Role description from Available Roles section]

Current task context:
[Task details]

Team knowledge from previous sessions:
[Include relevant knowledge if loaded]

Instructions:
1. Read the team config at ~/.claude/teams/task-[name]/config.json to see other team members
2. Check TaskList to see available tasks
3. Claim tasks relevant to your role using TaskUpdate
4. Work on your assigned tasks
5. Coordinate with other team members using SendMessage when needed
6. Mark tasks as completed when done
7. Share insights and learnings with team lead

Remember: [Any specific instructions for this role]",
  "team_name": "task-[brief-description]",
  "name": "[role-name]"
}
```

**CRITICAL**: The devils-advocate agent must be given this additional instruction:

```
As the devil's advocate, your job is to:
1. Wait for other team members to propose solutions or complete tasks
2. Critically analyze their work for potential issues:
   - Edge cases not considered
   - Performance implications
   - Security vulnerabilities
   - Maintenance burden
   - Alternative approaches
3. Challenge assumptions and ask "what if" questions
4. Provide constructive criticism to improve outcomes
5. Don't just agree - your value is in thoughtful disagreement
```

### 6. Coordinate Team Execution

As team lead:
1. Monitor team member messages (they arrive automatically)
2. Assign tasks to idle team members using TaskUpdate
3. Facilitate communication between team members
4. Resolve conflicts or blockers
5. Keep the devils-advocate engaged in reviewing work
6. Track progress using TaskList

### 7. Capture Learnings

After task completion but **before shutting down the team**, create or update team knowledge:

```bash
KNOWLEDGE_DIR="skills/agent-team/team-knowledge"
KNOWLEDGE_FILE="${KNOWLEDGE_DIR}/accumulated-knowledge.md"

# Ensure directory exists
mkdir -p "$KNOWLEDGE_DIR"

# Append new learnings
cat >> "$KNOWLEDGE_FILE" << 'EOF'

## Session: [Date/Time] - [Task Description]

### What Worked Well
- [Key success factors]
- [Effective approaches]
- [Good decisions]

### What Could Be Improved
- [Issues encountered]
- [Better alternatives identified]
- [Lessons learned]

### Key Insights
- [Technical insights]
- [Process improvements]
- [Architectural learnings]

### Devil's Advocate Highlights
- [Critical questions that improved outcomes]
- [Problems identified and addressed]
- [Alternative approaches considered]

---
EOF
```

**Important**: Use the Write or Edit tool to append to the knowledge file, not just bash redirection.

### 8. Shutdown Team

Once all tasks are complete and learnings are captured:

1. Send shutdown requests to all team members using SendMessage:
```
{
  "type": "shutdown_request",
  "recipient": "[agent-name]",
  "content": "Task complete. Thank you for your contributions."
}
```

2. Wait for shutdown confirmations

3. Clean up team resources using TeamDelete

### 9. Present Summary

Provide the user with:
- Summary of completed work
- Key decisions made
- Issues identified and resolved by devils-advocate
- Learnings captured for future sessions

## Team Knowledge Management

### Knowledge File Structure

The `skills/agent-team/team-knowledge/accumulated-knowledge.md` file accumulates learnings across sessions with this format:

```markdown
# Team Knowledge Repository

This file contains accumulated learnings from agent team executions.

## Session: [Date] - [Task]
[Learnings from that session]

## Session: [Date] - [Task]
[Learnings from next session]
```

### Git Exclusion

The team-knowledge directory is automatically excluded from git (see .gitignore section below).

## Important Notes

- **Devils-advocate is MANDATORY** for every task - this ensures quality
- Load existing team knowledge at the start of each session
- Capture learnings before shutting down the team
- Team knowledge accumulates over time, making the team smarter
- Teammates go idle between turns - this is normal
- Use SendMessage to communicate with teammates
- Always wait for teammates to complete work before requesting shutdown
- The team lead (you) coordinates but doesn't do all the work

## Example Execution Flow

```
User: "Implement user authentication with JWT"

1. Load team knowledge → Read previous authentication learnings
2. Select roles → architect, implementer, security, tester, devils-advocate
3. Create team → "task-auth-jwt"
4. Create tasks:
   - Design authentication architecture
   - Implement JWT generation and validation
   - Add security middleware
   - Write authentication tests
   - Review for security vulnerabilities
5. Spawn teammates (5 agents for the roles)
6. Coordinate execution:
   - Architect designs approach
   - Implementer writes code
   - Security reviews for vulnerabilities
   - Tester adds test coverage
   - Devils-advocate challenges decisions and identifies issues
7. Capture learnings:
   - JWT best practices discovered
   - Security patterns that worked
   - Edge cases identified by devils-advocate
8. Shutdown team
9. Present summary to user
```

## Troubleshooting

- **Teammate not responding**: Check if they're blocked by unfinished tasks
- **Devils-advocate too passive**: Send direct message asking for critical review
- **Task conflicts**: Use SendMessage to facilitate discussion between teammates
- **Knowledge file missing**: Create it fresh - first session always starts without prior knowledge
