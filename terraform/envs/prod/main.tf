# ==========================================
# Main Infrastructure Definition
# ==========================================

module "network" {
  source       = "../../modules/network"
  project_name = var.project_name
  vpc_cidr     = var.vpc_cidr
}

module "iam" {
  source       = "../../modules/iam"
  project_name = var.project_name
  github_repo  = var.github_repo
}

module "security_groups" {
  source       = "../../modules/security_groups"
  project_name = var.project_name
  vpc_id       = module.network.vpc_id
}

module "rds" {
  source            = "../../modules/rds"
  project_name      = var.project_name
  private_subnet_ids = module.network.private_subnet_ids
  rds_sg_id         = module.security_groups.rds_sg_id
  db_password       = var.db_password
}

module "ec2" {
  source                    = "../../modules/ec2"
  project_name              = var.project_name
  vpc_id                    = module.network.vpc_id
  public_subnet_id          = module.network.public_subnet_ids[0]
  ec2_sg_id                 = module.security_groups.ec2_sg_id
  iam_instance_profile_name = module.iam.ec2_iam_instance_profile_name
  key_name                  = var.key_name
  db_password               = var.db_password
  rds_endpoint              = module.rds.rds_endpoint
  secret_key                = var.secret_key
  environment               = var.environment
  google_api_key            = var.google_api_key
}

module "s3_cloudfront" {
  source          = "../../modules/s3_cloudfront"
  project_name    = var.project_name
  ec2_instance_id = module.ec2.instance_id
  ec2_public_dns  = module.ec2.ec2_public_ip # Using IP as DNS might be empty
}

module "scheduler" {
  source          = "../../modules/scheduler"
  project_name    = var.project_name
  ec2_instance_id = module.ec2.instance_id
  rds_instance_id = "${var.project_name}-db"
  lambda_stop_zip = "${path.module}/../../lambda_stop.zip"
  lambda_start_zip = "${path.module}/../../lambda_start.zip"
}
