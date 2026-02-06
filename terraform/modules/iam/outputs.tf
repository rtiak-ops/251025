output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}

output "ec2_iam_instance_profile_name" {
  value = aws_iam_instance_profile.ec2_ssm_profile.name
}
